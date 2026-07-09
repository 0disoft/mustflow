package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
)

const (
	defaultLockPath = ".mustflow/config/manifest.lock.toml"
	commandName     = "accept-manifest-lock-baseline"
)

var fileHeaderPattern = regexp.MustCompile(`^\[files\."((?:\\.|[^"\\])*)"\]\s*$`)

type config struct {
	root     string
	lockPath string
	allowNew bool
	paths    []string
}

type output struct {
	SchemaVersion string   `json:"schema_version"`
	Command       string   `json:"command"`
	Updated       []string `json:"updated"`
}

type fileBlock struct {
	path  string
	start int
	end   int
}

func main() {
	cfg, err := parseArgs(os.Args[1:])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}

	updated, err := run(cfg)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}

	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(output{
		SchemaVersion: "1",
		Command:       commandName,
		Updated:       updated,
	}); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func parseArgs(args []string) (config, error) {
	flags := flag.NewFlagSet(commandName, flag.ContinueOnError)
	flags.SetOutput(os.Stderr)

	cfg := config{}
	flags.StringVar(&cfg.root, "root", ".", "mustflow root directory")
	flags.StringVar(&cfg.lockPath, "lock", defaultLockPath, "manifest lock path, relative to --root unless absolute")
	flags.BoolVar(&cfg.allowNew, "allow-new", false, "allow creating a missing [files.\"...\"] entry")

	if err := flags.Parse(args); err != nil {
		return config{}, err
	}

	cfg.paths = flags.Args()
	if len(cfg.paths) == 0 {
		return config{}, errors.New("Usage: manifest-lock-accept [--root <dir>] [--lock <path>] [--allow-new] <relative-path>...")
	}

	return cfg, nil
}

func run(cfg config) ([]string, error) {
	root, err := secureExistingDirectory(cfg.root)
	if err != nil {
		return nil, fmt.Errorf("invalid root: %w", err)
	}

	lockPath, err := resolveLockPath(root, cfg.lockPath)
	if err != nil {
		return nil, err
	}

	raw, err := os.ReadFile(lockPath)
	if err != nil {
		return nil, fmt.Errorf("cannot read manifest lock: %w", err)
	}

	normalizedLock, newline := normalizeNewlines(string(raw))
	lines := strings.Split(normalizedLock, "\n")
	if len(lines) > 0 && lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	}

	blocks, err := parseFileBlocks(lines)
	if err != nil {
		return nil, err
	}

	updated := make([]string, 0, len(cfg.paths))
	for _, requestedPath := range cfg.paths {
		relativePath, err := normalizeRelativePath(requestedPath)
		if err != nil {
			return nil, err
		}

		filePath, err := resolveExistingFile(root, relativePath)
		if err != nil {
			return nil, err
		}

		hash, err := sha256File(filePath)
		if err != nil {
			return nil, err
		}

		block, exists := blocks[relativePath]
		if !exists {
			if !cfg.allowNew {
				return nil, fmt.Errorf("manifest lock has no entry for %s; pass --allow-new to create it", relativePath)
			}
			lines = appendNewFileBlock(lines, relativePath, "template_common", hash)
			blocks, err = parseFileBlocks(lines)
			if err != nil {
				return nil, err
			}
			updated = append(updated, relativePath)
			continue
		}

		lines = updateExistingBlock(lines, block, hash)
		blocks, err = parseFileBlocks(lines)
		if err != nil {
			return nil, err
		}
		updated = append(updated, relativePath)
	}

	content := strings.Join(lines, newline) + newline
	if err := writeFileAtomically(lockPath, []byte(content)); err != nil {
		return nil, err
	}

	return updated, nil
}

func secureExistingDirectory(value string) (string, error) {
	absolute, err := filepath.Abs(value)
	if err != nil {
		return "", err
	}

	info, err := os.Stat(absolute)
	if err != nil {
		return "", err
	}
	if !info.IsDir() {
		return "", fmt.Errorf("%s is not a directory", value)
	}

	resolved, err := filepath.EvalSymlinks(absolute)
	if err != nil {
		return "", err
	}
	return filepath.Clean(resolved), nil
}

func resolveLockPath(root string, value string) (string, error) {
	if strings.ContainsRune(value, 0) {
		return "", errors.New("lock path contains NUL")
	}

	var candidate string
	if filepath.IsAbs(value) {
		candidate = value
	} else {
		relativePath, err := normalizeRelativePath(value)
		if err != nil {
			return "", fmt.Errorf("invalid lock path: %w", err)
		}
		candidate = filepath.Join(root, filepath.FromSlash(relativePath))
	}

	resolved, err := filepath.EvalSymlinks(candidate)
	if err != nil {
		return "", fmt.Errorf("cannot resolve manifest lock path: %w", err)
	}
	if err := ensureInside(root, resolved); err != nil {
		return "", fmt.Errorf("unsafe manifest lock path: %w", err)
	}
	return resolved, nil
}

func resolveExistingFile(root string, relativePath string) (string, error) {
	candidate := filepath.Join(root, filepath.FromSlash(relativePath))
	resolved, err := filepath.EvalSymlinks(candidate)
	if err != nil {
		return "", fmt.Errorf("cannot resolve %s: %w", relativePath, err)
	}
	if err := ensureInside(root, resolved); err != nil {
		return "", fmt.Errorf("unsafe path %s: %w", relativePath, err)
	}

	info, err := os.Stat(resolved)
	if err != nil {
		return "", fmt.Errorf("cannot stat %s: %w", relativePath, err)
	}
	if !info.Mode().IsRegular() {
		return "", fmt.Errorf("%s is not a regular file", relativePath)
	}

	return resolved, nil
}

func ensureInside(root string, candidate string) error {
	relative, err := filepath.Rel(root, candidate)
	if err != nil {
		return err
	}
	if relative == "." {
		return nil
	}
	if strings.HasPrefix(relative, "..") || filepath.IsAbs(relative) {
		return fmt.Errorf("%s escapes %s", candidate, root)
	}
	return nil
}

func normalizeRelativePath(value string) (string, error) {
	if strings.ContainsRune(value, 0) {
		return "", errors.New("path contains NUL")
	}
	if filepath.IsAbs(value) || path.IsAbs(strings.ReplaceAll(value, "\\", "/")) {
		return "", fmt.Errorf("absolute paths are not allowed: %s", value)
	}

	normalized := strings.ReplaceAll(value, "\\", "/")
	for strings.HasPrefix(normalized, "./") {
		normalized = strings.TrimPrefix(normalized, "./")
	}
	normalized = path.Clean(normalized)

	if normalized == "." || normalized == "" {
		return "", errors.New("path must not be empty")
	}
	if normalized == ".." || strings.HasPrefix(normalized, "../") {
		return "", fmt.Errorf("path escapes root: %s", value)
	}

	return normalized, nil
}

func normalizeNewlines(content string) (string, string) {
	if strings.Contains(content, "\r\n") {
		return strings.ReplaceAll(content, "\r\n", "\n"), "\r\n"
	}
	return content, "\n"
}

func parseFileBlocks(lines []string) (map[string]fileBlock, error) {
	blocks := map[string]fileBlock{}
	for index, line := range lines {
		match := fileHeaderPattern.FindStringSubmatch(strings.TrimSpace(line))
		if match == nil {
			continue
		}

		relativePath, err := unquoteTomlBasicString(match[1])
		if err != nil {
			return nil, fmt.Errorf("invalid file table header on line %d: %w", index+1, err)
		}
		relativePath, err = normalizeRelativePath(relativePath)
		if err != nil {
			return nil, fmt.Errorf("invalid file table path on line %d: %w", index+1, err)
		}

		end := len(lines)
		for next := index + 1; next < len(lines); next++ {
			if strings.HasPrefix(strings.TrimSpace(lines[next]), "[") {
				end = next
				break
			}
		}

		blocks[relativePath] = fileBlock{
			path:  relativePath,
			start: index,
			end:   end,
		}
	}
	return blocks, nil
}

func unquoteTomlBasicString(value string) (string, error) {
	replacer := strings.NewReplacer(
		`\"`, `"`,
		`\\`, `\`,
		`\b`, "\b",
		`\f`, "\f",
		`\n`, "\n",
		`\r`, "\r",
		`\t`, "\t",
	)
	return replacer.Replace(value), nil
}

func quoteTomlBasicString(value string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `"`, `\"`)
	return replacer.Replace(value)
}

func sha256File(filePath string) (string, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}

	sum := sha256.Sum256(content)
	return "sha256:" + hex.EncodeToString(sum[:]), nil
}

func updateExistingBlock(lines []string, block fileBlock, hash string) []string {
	lastActionIndex := -1
	contentHashIndex := -1
	sourceIndex := -1

	for index := block.start + 1; index < block.end; index++ {
		trimmed := strings.TrimSpace(lines[index])
		switch {
		case strings.HasPrefix(trimmed, "source ="):
			sourceIndex = index
		case strings.HasPrefix(trimmed, "last_action ="):
			lastActionIndex = index
		case strings.HasPrefix(trimmed, "content_hash ="):
			contentHashIndex = index
		}
	}

	if lastActionIndex >= 0 {
		lines[lastActionIndex] = `last_action = "customized"`
	} else if sourceIndex >= 0 {
		lines = insertLine(lines, sourceIndex+1, `last_action = "customized"`)
		if contentHashIndex >= sourceIndex+1 {
			contentHashIndex++
		}
		block.end++
	} else {
		lines = insertLine(lines, block.start+1, `last_action = "customized"`)
		if contentHashIndex >= block.start+1 {
			contentHashIndex++
		}
		block.end++
	}

	if contentHashIndex >= 0 {
		lines[contentHashIndex] = fmt.Sprintf(`content_hash = "%s"`, hash)
		return lines
	}

	return insertLine(lines, block.end, fmt.Sprintf(`content_hash = "%s"`, hash))
}

func appendNewFileBlock(lines []string, relativePath string, source string, hash string) []string {
	if len(lines) > 0 && strings.TrimSpace(lines[len(lines)-1]) != "" {
		lines = append(lines, "")
	}
	return append(lines,
		fmt.Sprintf(`[files."%s"]`, quoteTomlBasicString(relativePath)),
		fmt.Sprintf(`source = "%s"`, source),
		`last_action = "customized"`,
		fmt.Sprintf(`content_hash = "%s"`, hash),
	)
}

func insertLine(lines []string, index int, value string) []string {
	lines = append(lines, "")
	copy(lines[index+1:], lines[index:])
	lines[index] = value
	return lines
}

func writeFileAtomically(target string, content []byte) error {
	directory := filepath.Dir(target)
	temp, err := os.CreateTemp(directory, ".manifest-lock-accept-*.tmp")
	if err != nil {
		return err
	}
	tempPath := temp.Name()
	defer os.Remove(tempPath)

	if _, err := temp.Write(content); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Close(); err != nil {
		return err
	}

	return os.Rename(tempPath, target)
}
