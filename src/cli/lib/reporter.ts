export interface Reporter {
	stdout(message: string): void;
	stderr(message: string): void;
}

export const consoleReporter: Reporter = {
	stdout(message) {
		console.log(message);
	},
	stderr(message) {
		console.error(message);
	},
};
