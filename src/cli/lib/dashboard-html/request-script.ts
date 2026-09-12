export const dashboardRequestScript = `
const dashboardRequestTimeoutMs = 30000;
let dashboardViewGeneration = 0;
let dashboardReadController = null;

function invalidateDashboardView() {
	dashboardViewGeneration += 1;
	if (dashboardReadController) dashboardReadController.abort();
	dashboardReadController = null;
}

async function requestDashboard(url, options = {}, parentSignal, responseType = "json") {
	const controller = new AbortController();
	const mutation = options.method && options.method !== "GET";
	let rejectCancellation;
	const cancelled = new Promise((resolve, reject) => { rejectCancellation = reject; });
	const cancel = (error) => {
		rejectCancellation(error);
		controller.abort();
	};
	const supersede = () => cancel(new DOMException("Superseded", "AbortError"));
	if (parentSignal) {
		parentSignal.addEventListener("abort", supersede, { once: true });
		if (parentSignal.aborted) supersede();
	}
	const timer = setTimeout(() => cancel(new Error(message(
		mutation ? "dashboard.ui.writeTimeout" : "dashboard.ui.requestTimeout"
	))), dashboardRequestTimeoutMs);
	try {
		const work = async () => {
			if (controller.signal.aborted) throw new DOMException("Superseded", "AbortError");
			const response = await fetch(url, {
				...options,
				headers: { "x-mustflow-dashboard-token": dashboardToken, ...options.headers },
				signal: controller.signal
			});
			if (!response.ok) throw new Error(await response.text());
			return responseType === "text" ? response.text() : response.json();
		};
		return await Promise.race([work(), cancelled]);
	} finally {
		clearTimeout(timer);
		if (parentSignal) parentSignal.removeEventListener("abort", supersede);
	}
}

async function updateDashboardView(url, options, apply) {
	invalidateDashboardView();
	const generation = dashboardViewGeneration;
	const isRead = !options.method || options.method === "GET";
	const controller = isRead ? new AbortController() : null;
	dashboardReadController = controller;
	setLoading(true);
	try {
		const data = await requestDashboard(url, options, controller?.signal);
		if (generation !== dashboardViewGeneration) return;
		apply(data);
	} catch (error) {
		if (generation === dashboardViewGeneration) statusText(error.message, "error");
	} finally {
		if (dashboardReadController === controller) dashboardReadController = null;
		setLoading(false);
	}
}
`;
