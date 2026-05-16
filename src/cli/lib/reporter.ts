export interface Reporter {
	stdout(message: string): void;
	stderr(message: string): void;
	writeStdout?(chunk: string | Buffer): void;
	writeStderr?(chunk: string | Buffer): void;
}

export const consoleReporter: Reporter = {
	stdout(message) {
		console.log(message);
	},
	stderr(message) {
		console.error(message);
	},
	writeStdout(chunk) {
		process.stdout.write(chunk);
	},
	writeStderr(chunk) {
		process.stderr.write(chunk);
	},
};
