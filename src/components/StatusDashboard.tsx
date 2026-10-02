import { useEffect, useState } from "react";
import {
    getGitHubSummary,
    getAllIncidents,
    getComponentUptime,
    getStatusColor,
    getStatusLabel,
    getStatusIcon,
    getImpactColor,
    calculateAverageUptime,
    type GitHubStatusSummary,
    type GitHubIncident,
    type GitHubComponent,
    type ComponentUptime,
} from "@/lib/githubStatus";

interface ComponentDetail {
    component: GitHubComponent;
    uptime: ComponentUptime[];
    incidents: GitHubIncident[];
}

export function StatusDashboard() {
    const [summary, setSummary] = useState<GitHubStatusSummary | null>(null);
    const [allIncidents, setAllIncidents] = useState<GitHubIncident[]>([]);
    const [selectedComponent, setSelectedComponent] = useState<ComponentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingComponent, setLoadingComponent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [summaryData, incidentsData] = await Promise.all([
                getGitHubSummary(),
                getAllIncidents(),
            ]);
            setSummary(summaryData);
            setAllIncidents(incidentsData.incidents || []);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch status data");
        } finally {
            setLoading(false);
        }
    };

    const fetchComponentDetails = async (component: GitHubComponent) => {
        const componentName = component.name.toLowerCase();
        const componentIncidents = allIncidents.filter((incident) => {
            if (incident.components?.some((c) => c.id === component.id || c.name === component.name)) {
                return true;
            }

            if (incident.incident_updates?.some((update) =>
                update.affected_components?.some((ac) =>
                    ac.code === component.id ||
                    ac.name === component.name ||
                    ac.name.toLowerCase().includes(componentName) ||
                    componentName.includes(ac.name.toLowerCase())
                )
            )) {
                return true;
            }

            const incidentName = incident.name.toLowerCase();
            if (incidentName.includes(componentName) || componentName.includes(incidentName.split(' ')[0])) {
                return true;
            }

            return false;
        });

        setSelectedComponent({
            component,
            uptime: [],
            incidents: componentIncidents.slice(0, 10),
        });
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
        }).format(date);
    };

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return "just now";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return formatDate(dateString);
    };

    const formatIncidentBody = (body: string) => {
        return body
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/\n\n+/g, '\n\n')
            .trim();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-muted-foreground">Loading GitHub status...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-destructive mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h3 className="font-semibold text-destructive">Error Loading Status</h3>
                        <p className="text-sm text-muted-foreground mt-1">{error}</p>
                        <button onClick={fetchData} className="mt-3 text-sm font-medium text-destructive underline underline-offset-4">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!summary) return null;

    const operationalComponents = summary.components.filter((c) => !c.group && c.status === "operational");
    const degradedComponents = summary.components.filter((c) => !c.group && c.status !== "operational");
    const activeIncidents = summary.incidents.filter((i) => !i.resolved_at);
    const displayComponents = summary.components.filter(
        (c) => !c.group && c.name !== "Visit www.githubstatus.com for more information"
    );

    return (
        <div className="space-y-8">
            <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Overall Status</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Last updated: {formatRelativeTime(lastUpdated.toISOString())}
                        </p>
                    </div>
                    <button onClick={fetchData} className="inline-flex h-9 items-center px-4 text-sm font-medium rounded-lg border bg-card shadow-xs hover:bg-accent hover:border-brand/30 transition-colors">
                        Refresh
                    </button>
                </div>

                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${getStatusColor(summary.status.indicator)}`}>
                    <span className={`w-2 h-2 rounded-full ${summary.status.indicator === "none" ? "bg-green-600" : "bg-yellow-600"}`}></span>
                    {summary.status.description}
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl border bg-surface/60">
                        <div className="text-3xl font-semibold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">{operationalComponents.length}</div>
                        <div className="text-sm text-muted-foreground">Operational Services</div>
                    </div>
                    <div className="p-4 rounded-xl border bg-surface/60">
                        <div className="text-3xl font-semibold tracking-tight tabular-nums text-orange-600 dark:text-orange-400">{degradedComponents.length}</div>
                        <div className="text-sm text-muted-foreground">Issues Detected</div>
                    </div>
                    <div className="p-4 rounded-xl border bg-surface/60">
                        <div className="text-3xl font-semibold tracking-tight tabular-nums text-blue-600 dark:text-blue-400">{activeIncidents.length}</div>
                        <div className="text-sm text-muted-foreground">Active Incidents</div>
                    </div>
                </div>
            </div>

            {degradedComponents.length > 0 && (
                <div className="rounded-2xl border border-orange-500/25 bg-orange-500/5 p-5 sm:p-6">
                    <h3 className="text-lg font-semibold tracking-tight text-orange-700 dark:text-orange-400 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Services with Issues
                    </h3>
                    <div className="space-y-3">
                        {degradedComponents.map((component) => (
                            <div key={component.id} className="bg-card rounded-xl border border-orange-500/20 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-foreground">{component.name}</h4>
                                        {component.description && <p className="text-sm text-muted-foreground mt-1">{component.description}</p>}
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(component.status)}`}>
                                        {getStatusLabel(component.status)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
                <h3 className="text-lg font-semibold tracking-tight mb-4">All Services - Click for Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {displayComponents
                        .sort((a, b) => a.position - b.position)
                        .map((component) => (
                            <button
                                key={component.id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log("Clicked component:", component.name);
                                    fetchComponentDetails(component);
                                }}
                                type="button"
                                className="group flex items-center justify-between p-4 rounded-xl bg-surface/60 hover:bg-accent hover:border-brand/30 transition-colors border text-left cursor-pointer"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg flex-shrink-0">{getStatusIcon(component.status)}</span>
                                        <h4 className="font-medium truncate">{component.name}</h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatRelativeTime(component.updated_at)}
                                    </p>
                                </div>
                                <svg className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ))}
                </div>
            </div>

            {selectedComponent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-popover border border-border shadow-2xl rounded-2xl max-w-4xl w-full my-4 sm:my-8 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="sticky top-0 bg-popover/95 backdrop-blur border-b p-5 sm:p-6 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">{selectedComponent.component.name}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{selectedComponent.component.description}</p>
                            </div>
                            <button onClick={() => setSelectedComponent(null)} className="p-2 hover:bg-accent rounded-lg flex-shrink-0">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 space-y-6 max-h-[calc(90dvh-120px)] overflow-y-auto">
                            <>
                                <div>
                                    <h4 className="text-lg font-semibold mb-3">Current Status</h4>
                                    <div className="p-4 rounded-xl border bg-muted/50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedComponent.component.status)}`}>
                                                    <span>{getStatusIcon(selectedComponent.component.status)}</span>
                                                    {getStatusLabel(selectedComponent.component.status)}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    Last updated: {formatDate(selectedComponent.component.updated_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-lg font-semibold mb-3">
                                        Recent Events for {selectedComponent.component.name}
                                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                                            ({selectedComponent.incidents.length} {selectedComponent.incidents.length === 1 ? 'incident' : 'incidents'} found)
                                        </span>
                                    </h4>
                                    {selectedComponent.incidents && selectedComponent.incidents.length > 0 ? (
                                        <div className="space-y-4">
                                            {selectedComponent.incidents.map((incident) => (
                                                <div key={incident.id} className="border rounded-xl p-4 bg-card">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex-1">
                                                            <h5 className="font-semibold text-lg">{incident.name}</h5>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                Started: {formatDate(incident.started_at)}
                                                            </p>
                                                            {incident.resolved_at && (
                                                                <p className="text-sm text-green-600 mt-1">
                                                                    Resolved: {formatDate(incident.resolved_at)}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getImpactColor(incident.impact)}`}>
                                                            {incident.impact.toUpperCase()}
                                                        </span>
                                                    </div>

                                                    {incident.incident_updates && incident.incident_updates.length > 0 && (
                                                        <div className="mt-4 space-y-3 border-t pt-3">
                                                            <h6 className="text-sm font-semibold text-muted-foreground">Updates</h6>
                                                            {incident.incident_updates.slice(0, 3).map((update) => (
                                                                <div key={update.id} className="bg-muted/60 rounded-lg p-3">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-xs font-medium text-brand uppercase">
                                                                            {update.status.replace(/_/g, " ")}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {formatRelativeTime(update.created_at)}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm whitespace-pre-wrap">{formatIncidentBody(update.body)}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <a
                                                        href={incident.shortlink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 mt-3 text-sm text-brand hover:underline"
                                                    >
                                                        View full incident details
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 rounded-xl border border-emerald-500/25 bg-emerald-500/5 text-center">
                                            <svg className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="font-semibold text-emerald-700 dark:text-emerald-400">No Recent Incidents</p>
                                            <p className="text-sm text-muted-foreground mt-1">This service has been running smoothly</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}