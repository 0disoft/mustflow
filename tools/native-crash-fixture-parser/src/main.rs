use std::env;
use std::io::{self, Read};
use std::process::ExitCode;

use goblin::elf::Elf;
use minidump::{
    Minidump, MinidumpException, MinidumpModuleList, MinidumpSystemInfo, MinidumpThreadList,
};
use serde::Serialize;

const MAX_INPUT_BYTES: u64 = 1024 * 1024;

#[derive(Serialize)]
struct MinidumpReport {
    format: &'static str,
    stream_count: usize,
    processor_architecture: u16,
    module_count: usize,
    thread_ids: Vec<u32>,
    exception_thread_id: u32,
    exception_code: u32,
    exception_address: String,
    exception_parameter_count: u32,
    access_kind: u64,
    fault_address: String,
}

#[derive(Serialize)]
struct ElfReport {
    format: &'static str,
    class_bits: u8,
    little_endian: bool,
    elf_type: u16,
    machine: u16,
    program_header_count: usize,
    load_segment_count: usize,
    executable_load_segment_count: usize,
    note_segment_count: usize,
    note_types: Vec<u32>,
}

#[derive(Serialize)]
struct ErrorReport<'a> {
    ok: bool,
    error: &'a str,
}

fn read_bounded_stdin() -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    io::stdin()
        .take(MAX_INPUT_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| format!("stdin_read_failed: {error}"))?;
    if bytes.len() as u64 > MAX_INPUT_BYTES {
        return Err("input_too_large".to_string());
    }
    Ok(bytes)
}

fn inspect_minidump(bytes: Vec<u8>) -> Result<MinidumpReport, String> {
    let dump = Minidump::read(bytes).map_err(|error| format!("minidump_parse_failed: {error}"))?;
    let system = dump
        .get_stream::<MinidumpSystemInfo>()
        .map_err(|error| format!("system_info_failed: {error}"))?;
    let modules = dump
        .get_stream::<MinidumpModuleList>()
        .map_err(|error| format!("module_list_failed: {error}"))?;
    let threads = dump
        .get_stream::<MinidumpThreadList>()
        .map_err(|error| format!("thread_list_failed: {error}"))?;
    let exception = dump
        .get_stream::<MinidumpException>()
        .map_err(|error| format!("exception_failed: {error}"))?;
    let record = &exception.raw.exception_record;
    Ok(MinidumpReport {
        format: "minidump",
        stream_count: dump.all_streams().count(),
        processor_architecture: system.raw.processor_architecture,
        module_count: modules.iter().count(),
        thread_ids: threads.threads.iter().map(|thread| thread.raw.thread_id).collect(),
        exception_thread_id: exception.thread_id,
        exception_code: record.exception_code,
        exception_address: format!("0x{:x}", record.exception_address),
        exception_parameter_count: record.number_parameters,
        access_kind: record.exception_information[0],
        fault_address: format!("0x{:x}", record.exception_information[1]),
    })
}

fn inspect_elf(bytes: &[u8]) -> Result<ElfReport, String> {
    let elf = Elf::parse(bytes).map_err(|error| format!("elf_parse_failed: {error}"))?;
    let mut note_types = Vec::new();
    if let Some(notes) = elf.iter_note_headers(bytes) {
        for note in notes {
            note_types.push(
                note.map_err(|error| format!("elf_note_parse_failed: {error}"))?
                    .n_type,
            );
        }
    }
    let load_segment_count = elf
        .program_headers
        .iter()
        .filter(|header| header.p_type == goblin::elf::program_header::PT_LOAD)
        .count();
    let executable_load_segment_count = elf
        .program_headers
        .iter()
        .filter(|header| {
            header.p_type == goblin::elf::program_header::PT_LOAD && header.is_executable()
        })
        .count();
    let note_segment_count = elf
        .program_headers
        .iter()
        .filter(|header| header.p_type == goblin::elf::program_header::PT_NOTE)
        .count();
    Ok(ElfReport {
        format: "elf-core",
        class_bits: if elf.is_64 { 64 } else { 32 },
        little_endian: elf.little_endian,
        elf_type: elf.header.e_type,
        machine: elf.header.e_machine,
        program_header_count: elf.program_headers.len(),
        load_segment_count,
        executable_load_segment_count,
        note_segment_count,
        note_types,
    })
}

fn run() -> Result<String, String> {
    let mode = env::args().nth(1).ok_or_else(|| "missing_format".to_string())?;
    let bytes = read_bounded_stdin()?;
    match mode.as_str() {
        "minidump" => serde_json::to_string(&inspect_minidump(bytes)?)
            .map_err(|error| format!("json_encode_failed: {error}")),
        "elf" => serde_json::to_string(&inspect_elf(&bytes)?)
            .map_err(|error| format!("json_encode_failed: {error}")),
        _ => Err("unsupported_format".to_string()),
    }
}

fn main() -> ExitCode {
    match run() {
        Ok(report) => {
            println!("{report}");
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!(
                "{}",
                serde_json::to_string(&ErrorReport {
                    ok: false,
                    error: &error,
                })
                .unwrap_or_else(|_| "{\"ok\":false,\"error\":\"unknown\"}".to_string())
            );
            ExitCode::FAILURE
        }
    }
}
