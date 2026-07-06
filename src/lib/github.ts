import { ghFetch } from "@/lib/githubProxy";

export async function fetchAllBranches(owner: string, repo: string, _token?: string | null): Promise<string[]> {
    const branches: string[] = [];
    let page = 1;
    let hasNextPage = true;

    const MAX_BRANCHES = 5000;

    while (hasNextPage && branches.length < MAX_BRANCHES) {
        try {
            const res = await ghFetch(`/repos/${owner}/${repo}/branches?per_page=100&page=${page}`, {
                headers: {
                    Accept: "application/vnd.github.v3+json",
                },
            });

            if (!res.ok) {
                console.error(`Failed to fetch branches page ${page}: ${res.status} ${res.statusText}`);
                break;
            }

            const data = await res.json();

            if (!Array.isArray(data) || data.length === 0) {
                hasNextPage = false;
            } else {
                const newBranches = data.map((b: { name: string }) => b.name);
                branches.push(...newBranches);

                if (data.length < 100) {
                    hasNextPage = false;
                } else {
                    page++;
                }
            }
        } catch (error) {
            console.error("Error fetching branches:", error);
            break;
        }
    }

    return branches.sort((a, b) => a.localeCompare(b));
}
