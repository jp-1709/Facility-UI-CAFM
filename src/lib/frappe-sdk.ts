import { FrappeApp } from "frappe-js-sdk";

const frappe = new FrappeApp(import.meta.env.VITE_FRAPPE_BASE_URL);

export const call = frappe.call();
export const db = frappe.db();
export const auth = frappe.auth();

export function getCookie(name: string): string | null {
	const cookieStr = typeof document !== 'undefined' ? document.cookie : '';
	if (!cookieStr) return null;
	const cookieArr = cookieStr.split(';');
	for (let i = 0; i < cookieArr.length; i++) {
		const cookiePair = cookieArr[i].split('=');
		if (name === cookiePair[0].trim()) {
			return decodeURIComponent(cookiePair[1]);
		}
	}
	return null;
}

export function getCsrfToken(): string {
	if (typeof document === "undefined") return "";
	const match = document.cookie.match(/(?:^|;)\s*(csrf_token|X-Frappe-CSRF-Token)=([^;]+)/);
	const cookieToken = match ? decodeURIComponent(match[2]) : "";
	const windowToken = typeof window !== "undefined" ? (window as any).csrf_token : "";
	return cookieToken || windowToken || "";
}

export async function frappeFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
	const csrfToken = getCsrfToken();

	const headers = new Headers(init.headers || {});
	if (!headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}
	if (csrfToken && !headers.has('X-Frappe-CSRF-Token')) {
		headers.set('X-Frappe-CSRF-Token', csrfToken);
	}

	const finalInit: RequestInit = {
		...init,
		headers,
		credentials: 'include',
		mode: 'cors',
	};

	return fetch(input, finalInit);
}
/**
 * Generates Row-Level Security (RLS) filters based on user role and metadata.
 */
export function getRLSFilters(doctype: string, user: any, roles: string[]) {
const isAdmin = roles.some(r => ["Super Admin", "Administrator", "System Manager"].includes(r));
if (isAdmin) return [];

const filters: any[] = [];

if (doctype === "Work Orders") {
if (roles.includes("Technician")) {
if (user?.staff_code) filters.push(["assigned_to", "=", user.staff_code]);
} else if (roles.includes("Branch Manager") || roles.includes("Supervisor")) {
if (user?.branch_code) filters.push(["branch_code", "=", user.branch_code]);
}
} else if (doctype === "Service Request") {
if (user?.branch_code) filters.push(["branch_code", "=", user.branch_code]);
}

return filters;
}
