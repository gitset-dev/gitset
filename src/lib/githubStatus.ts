export interface GitHubStatus {
    status: {
        indicator: string;
        description: string;
    };
    page: {
        id: string;
        name: string;
        url: string;
        updated_at: string;
    };
}

export interface GitHubComponent {
    id: string;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
    position: number;
    description: string | null;
    showcase: boolean;
    start_date: string | null;
    group_id: string | null;
    page_id: string;
    group: boolean;
    only_show_if_degraded: boolean;
}

export interface GitHubIncidentUpdate {
    id: string;
    status: string;
    body: string;
    incident_id: string;
    created_at: string;
    updated_at: string;
    display_at: string;
    affected_components: Array<{
        code: string;
        name: string;
        old_status: string;
        new_status: string;
    }>;
}

export interface GitHubIncident {
    id: string;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
    monitoring_at: string | null;
    resolved_at: string | null;
    impact: string;
    shortlink: string;
    started_at: string;
    page_id: string;
    incident_updates: GitHubIncidentUpdate[];
    components: Array<{
        id: string;
        name: string;
        status: string;
    }>;
}

export interface ComponentUptime {
    range_start: string;
    range_end: string;
    uptime_percentage: number;
    major_outage: number;
    partial_outage: number;
    degraded_performance: number;
    related_events: Array<{
        type: string;
        name: string;
        code: string;
    }>;
}

export interface ComponentHistory {
    component: GitHubComponent;
    days: Array<{
        date: string;
        uptime_percentage: number;
        major_outage: number;
        partial_outage: number;
    }>;
}

export interface GitHubStatusSummary {
    page: {
        id: string;
        name: string;
        url: string;
        time_zone: string;
        updated_at: string;
    };
    components: GitHubComponent[];
    incidents: GitHubIncident[];
    scheduled_maintenances: Array<any>;
    status: {
        indicator: string;
        description: string;
    };
}

const GITHUB_STATUS_API = "https://www.githubstatus.com/api/v2";

export async function getGitHubStatus(): Promise<GitHubStatus> {
    const response = await fetch(`${GITHUB_STATUS_API}/status.json`);
    if (!response.ok) {
        throw new Error(`Failed to fetch GitHub status: ${response.statusText}`);
    }
    return response.json();
}

export async function getGitHubSummary(): Promise<GitHubStatusSummary> {
    const response = await fetch(`${GITHUB_STATUS_API}/summary.json`);
    if (!response.ok) {
        throw new Error(`Failed to fetch GitHub summary: ${response.statusText}`);
    }
    return response.json();
}

export async function getComponentUptime(componentId: string): Promise<ComponentUptime[]> {
    const response = await fetch(
        `${GITHUB_STATUS_API}/components/${componentId}/uptime.json`
    );
    if (!response.ok) {
        throw new Error(`Failed to fetch component uptime: ${response.statusText}`);
    }
    const data = await response.json();
    return data.uptime || [];
}

export async function getAllIncidents(): Promise<{
    incidents: GitHubIncident[];
}> {
    const response = await fetch(`${GITHUB_STATUS_API}/incidents.json`);
    if (!response.ok) {
        throw new Error(`Failed to fetch incidents: ${response.statusText}`);
    }
    return response.json();
}

export async function getUnresolvedIncidents(): Promise<{
    incidents: GitHubIncident[];
}> {
    const response = await fetch(`${GITHUB_STATUS_API}/incidents/unresolved.json`);
    if (!response.ok) {
        throw new Error(`Failed to fetch unresolved incidents: ${response.statusText}`);
    }
    return response.json();
}

export async function getScheduledMaintenances(): Promise<{
    scheduled_maintenances: Array<any>;
}> {
    const response = await fetch(
        `${GITHUB_STATUS_API}/scheduled-maintenances/upcoming.json`
    );
    if (!response.ok) {
        throw new Error(`Failed to fetch maintenances: ${response.statusText}`);
    }
    return response.json();
}

export function getStatusColor(status: string): string {
    switch (status) {
        case "operational":
            return "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25";
        case "degraded_performance":
            return "text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 border border-yellow-500/25";
        case "partial_outage":
            return "text-orange-700 dark:text-orange-400 bg-orange-500/10 border border-orange-500/25";
        case "major_outage":
            return "text-red-700 dark:text-red-400 bg-red-500/10 border border-red-500/25";
        case "under_maintenance":
            return "text-blue-700 dark:text-blue-400 bg-blue-500/10 border border-blue-500/25";
        default:
            return "text-gray-600 bg-gray-50 border-gray-200";
    }
}

export function getStatusIcon(status: string): string {
    switch (status) {
        case "operational":
            return "✓";
        case "degraded_performance":
            return "⚠";
        case "partial_outage":
            return "⚠";
        case "major_outage":
            return "✕";
        case "under_maintenance":
            return "🔧";
        default:
            return "?";
    }
}

export function getStatusLabel(status: string): string {
    switch (status) {
        case "operational":
            return "Operational";
        case "degraded_performance":
            return "Degraded Performance";
        case "partial_outage":
            return "Partial Outage";
        case "major_outage":
            return "Major Outage";
        case "under_maintenance":
            return "Under Maintenance";
        default:
            return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
}

export function getImpactColor(impact: string): string {
    switch (impact) {
        case "none":
            return "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25";
        case "minor":
            return "text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 border border-yellow-500/25";
        case "major":
            return "text-orange-700 dark:text-orange-400 bg-orange-500/10 border border-orange-500/25";
        case "critical":
            return "text-red-700 dark:text-red-400 bg-red-500/10 border border-red-500/25";
        default:
            return "text-muted-foreground bg-muted border border-border";
    }
}

export function calculateAverageUptime(uptimes: ComponentUptime[]): number {
    if (uptimes.length === 0) return 100;
    const sum = uptimes.reduce((acc, uptime) => acc + uptime.uptime_percentage, 0);
    return sum / uptimes.length;
}