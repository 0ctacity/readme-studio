import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import {
  clearStoredSession,
  fetchRepositoryReadme,
  fetchUserRepositories,
  publishReadmeToRepository,
  type GitHubRepository,
  type GitHubSessionData,
} from '../lib/github';

export type GitHubModalTab = 'open' | 'publish';

interface GitHubModalProps {
  readonly isOpen: boolean;
  readonly initialTab?: GitHubModalTab;
  readonly session: GitHubSessionData | null;
  readonly readmeContent: string;
  readonly workflowFiles: readonly { readonly path: string; readonly content: string }[];
  readonly onClose: () => void;
  readonly onLogin: () => void;
  readonly onLogout: () => void;
  readonly onLoadReadme: (content: string, repoFullName: string) => void;
}

export function GitHubModal(props: GitHubModalProps) {
  const [tab, setTab] = createSignal<GitHubModalTab>('open');
  const [repositories, setRepositories] = createSignal<readonly GitHubRepository[]>([]);
  const [loadingRepos, setLoadingRepos] = createSignal(false);
  const [repoSearch, setRepoSearch] = createSignal('');
  const [selectedRepo, setSelectedRepo] = createSignal<GitHubRepository | null>(null);
  const [branch, setBranch] = createSignal('main');
  const [commitMessage, setCommitMessage] = createSignal('docs: update README with Readme Studio');
  const [publishing, setPublishing] = createSignal(false);
  const [publishSuccess, setPublishSuccess] = createSignal<string | null>(null);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  createEffect(() => {
    if (props.initialTab) setTab(props.initialTab);
  });

  createEffect(() => {
    if (props.isOpen && props.session && repositories().length === 0) {
      loadRepos();
    }
  });

  async function loadRepos(): Promise<void> {
    if (!props.session) return;
    setLoadingRepos(true);
    setErrorMessage(null);
    try {
      const repos = await fetchUserRepositories(props.session.token);
      setRepositories(repos);
      if (repos.length > 0 && !selectedRepo()) {
        setSelectedRepo(repos[0]);
        setBranch(repos[0].default_branch);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load repositories');
    } finally {
      setLoadingRepos(false);
    }
  }

  const filteredRepos = createMemo(() => {
    const query = repoSearch().toLowerCase().trim();
    if (!query) return repositories();
    return repositories().filter((repo) =>
      repo.name.toLowerCase().includes(query) || repo.full_name.toLowerCase().includes(query),
    );
  });

  async function handleOpenRepo(repo: GitHubRepository): Promise<void> {
    if (!props.session) return;
    setErrorMessage(null);
    try {
      const result = await fetchRepositoryReadme(props.session.token, repo.owner.login, repo.name, repo.default_branch);
      props.onLoadReadme(result.content, repo.full_name);
      props.onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load README from repository');
    }
  }

  async function handlePublish(): Promise<void> {
    const repo = selectedRepo();
    if (!props.session || !repo) return;
    setPublishing(true);
    setErrorMessage(null);
    setPublishSuccess(null);

    try {
      const result = await publishReadmeToRepository(props.session.token, repo.owner.login, repo.name, {
        branch: branch() || repo.default_branch,
        commitMessage: commitMessage() || 'docs: update README with Readme Studio',
        readmeContent: props.readmeContent,
        workflowFiles: props.workflowFiles,
      });
      setPublishSuccess(`Successfully pushed commit to ${result.repository} on branch ${result.branch}!`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to publish to repository');
    } finally {
      setPublishing(false);
    }
  }

  function handleSelectRepoForPublish(repo: GitHubRepository): void {
    setSelectedRepo(repo);
    setBranch(repo.default_branch);
  }

  if (!props.isOpen) return null;

  return (
    <div class="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}>
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="github-modal-title">
        <header class="modal-header">
          <div class="modal-title-group">
            <span class="github-icon-badge" aria-hidden="true">GH</span>
            <div>
              <h2 id="github-modal-title">GitHub Integration</h2>
              <Show when={props.session}>
                <small class="connected-user">
                  Connected as <strong>@{props.session?.user.login}</strong>
                </small>
              </Show>
            </div>
          </div>
          <button class="modal-close" onClick={props.onClose} aria-label="Close dialog">✕</button>
        </header>

        <Show when={!props.session}>
          <div class="modal-body auth-prompt">
            <div class="auth-hero">
              <span class="auth-icon">🐙</span>
              <h3>Connect your GitHub account</h3>
              <p>Authorize Readme Studio to browse your repositories, open README files directly, and publish commits and workflow files with 1 click.</p>
              <button class="button primary connect-action" onClick={props.onLogin}>
                Sign in with GitHub
              </button>
              <small class="privacy-note">Uses PKCE OAuth with zero tracking. Your tokens are encrypted and never stored in clear text.</small>
            </div>
          </div>
        </Show>

        <Show when={props.session}>
          <nav class="modal-tabs">
            <button class={{ active: tab() === 'open' }} onClick={() => setTab('open')}>
              Open from GitHub
            </button>
            <button class={{ active: tab() === 'publish' }} onClick={() => setTab('publish')}>
              Publish to GitHub
            </button>
          </nav>

          <div class="modal-body">
            <Show when={errorMessage()}>
              <div class="modal-alert error">{errorMessage()}</div>
            </Show>
            <Show when={publishSuccess()}>
              <div class="modal-alert success">{publishSuccess()}</div>
            </Show>

            <Show when={tab() === 'open'}>
              <div class="repo-search-bar">
                <input
                  type="search"
                  placeholder="Search your repositories…"
                  value={repoSearch()}
                  onInput={(e) => setRepoSearch(e.currentTarget.value)}
                />
                <button class="button ghost" onClick={loadRepos} disabled={loadingRepos()}>
                  {loadingRepos() ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>

              <div class="repo-list" role="list">
                <Show when={loadingRepos()}>
                  <p class="loading-state">Loading your repositories…</p>
                </Show>
                <Show when={!loadingRepos() && filteredRepos().length === 0}>
                  <p class="empty-state-text">No repositories found.</p>
                </Show>
                <For each={filteredRepos()}>
                  {(repo) => (
                    <div class="repo-card" role="listitem">
                      <div class="repo-info">
                        <div class="repo-name-row">
                          <strong>{repo.name}</strong>
                          <Show when={repo.private}><span class="badge-tag">Private</span></Show>
                          <Show when={repo.fork}><span class="badge-tag">Fork</span></Show>
                        </div>
                        <Show when={repo.description}>
                          <p class="repo-desc">{repo.description}</p>
                        </Show>
                        <small class="repo-branch">Default: <code>{repo.default_branch}</code></small>
                      </div>
                      <button class="button" onClick={() => handleOpenRepo(repo)}>
                        Open README
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <Show when={tab() === 'publish'}>
              <div class="publish-form">
                <label>
                  Target repository
                  <select
                    value={selectedRepo()?.full_name ?? ''}
                    onChange={(e) => {
                      const found = repositories().find((r) => r.full_name === e.currentTarget.value);
                      if (found) handleSelectRepoForPublish(found);
                    }}
                  >
                    <For each={repositories()}>
                      {(repo) => <option value={repo.full_name}>{repo.full_name}</option>}
                    </For>
                  </select>
                </label>

                <div class="field-row">
                  <label>
                    Target branch
                    <input
                      type="text"
                      value={branch()}
                      placeholder="main"
                      onInput={(e) => setBranch(e.currentTarget.value)}
                    />
                  </label>
                </div>

                <label>
                  Commit message
                  <input
                    type="text"
                    value={commitMessage()}
                    onInput={(e) => setCommitMessage(e.currentTarget.value)}
                  />
                </label>

                <div class="publish-preview-box">
                  <h4>Files to be committed:</h4>
                  <ul>
                    <li><code>README.md</code> (Current Markdown document)</li>
                    <For each={props.workflowFiles}>
                      {(file) => <li><code>{file.path}</code> (Automation workflow)</li>}
                    </For>
                  </ul>
                </div>

                <button
                  class="button primary wide-action"
                  disabled={publishing() || !selectedRepo()}
                  onClick={handlePublish}
                >
                  {publishing() ? 'Pushing commit to GitHub…' : 'Push Commit to GitHub'}
                </button>
              </div>
            </Show>
          </div>

          <footer class="modal-footer">
            <button class="button ghost" onClick={props.onLogout}>Disconnect GitHub</button>
            <button class="button ghost" onClick={props.onClose}>Close</button>
          </footer>
        </Show>
      </div>
    </div>
  );
}
