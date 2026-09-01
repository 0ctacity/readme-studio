import { createEffect, createMemo, createSignal, Show } from 'solid-js';
import { generateSnakeSvg, getGameSvg } from '../lib/arcade-preview';
import { fetchRealGitHubContributions, type ContributionMatrix } from '../lib/contributions';
import type { GitHubUser } from '../lib/github';
import {
  ARCADE_GAMES,
  CAPSULE_SHAPES,
  PROFILE_TEMPLATES,
  SOCIAL_PLATFORMS,
  TECH_PROVIDERS,
  buildArcadeMarkdown,
  buildCapsuleMarkdown,
  buildGitHubStatsMarkdown,
  buildImageMarkdown,
  buildMediumMarkdown,
  buildProfileViewsMarkdown,
  buildSnakeMarkdown,
  buildSocialLinksMarkdown,
  buildTechStackMarkdown,
  buildTextMarkdown,
  type Alignment,
  type ArcadeGame,
  type CapsuleShape,
  type ProfileToolId,
  type SocialPlatformId,
  type StatsCard,
  type TechProvider,
  type TextTag,
} from '../lib/profile';

interface ProfileInspectorProps {
  readonly tool: ProfileToolId;
  readonly currentUser?: GitHubUser | null;
  readonly sessionToken?: string;
  readonly onInsert: (markdown: string) => void;
  readonly onReplace: (markdown: string) => void;
}

const alignmentOptions: readonly Alignment[] = ['left', 'center', 'right'];
const statsCards: readonly { id: StatsCard; label: string }[] = [
  { id: 'stats', label: 'Overview' },
  { id: 'languages', label: 'Languages' },
  { id: 'streak', label: 'Streak' },
  { id: 'trophy', label: 'Trophies' },
  { id: 'activity', label: 'Activity graph' },
];

export function ProfileInspector(props: ProfileInspectorProps) {
  const [username, setUsername] = createSignal(props.currentUser?.login ?? '');
  const [align, setAlign] = createSignal<Alignment>('center');
  const [imageUrl, setImageUrl] = createSignal('https://i.imgflip.com/65efzo.gif');
  const [imageAlt, setImageAlt] = createSignal('Profile animation');
  const [imageHeight, setImageHeight] = createSignal(200);
  const [profileText, setProfileText] = createSignal('Hello world!');
  const [textTag, setTextTag] = createSignal<TextTag>('h2');
  const [technologies, setTechnologies] = createSignal('typescript, solidjs, vite, bun');
  const [techProvider, setTechProvider] = createSignal<TechProvider>('skill-icons');
  const [socialPlatform, setSocialPlatform] = createSignal<SocialPlatformId>('github');
  const [socialLinks, setSocialLinks] = createSignal<Partial<Record<SocialPlatformId, string>>>({});
  const [socialStyle, setSocialStyle] = createSignal<'icons' | 'badges'>('icons');
  const [selectedStats, setSelectedStats] = createSignal<readonly StatsCard[]>(['stats', 'languages']);
  const [statsTheme, setStatsTheme] = createSignal('dracula');
  const [statsLocale, setStatsLocale] = createSignal('en');
  const [hideBorder, setHideBorder] = createSignal(true);
  const [hideTitle, setHideTitle] = createSignal(false);
  const [languagesCount, setLanguagesCount] = createSignal(6);
  const [viewProvider, setViewProvider] = createSignal<'laobi' | 'getloli'>('laobi');
  const [viewLabel, setViewLabel] = createSignal('Profile views');
  const [leftColor, setLeftColor] = createSignal('555555');
  const [rightColor, setRightColor] = createSignal('ed6338');
  const [arcadeGame, setArcadeGame] = createSignal<ArcadeGame>('pacman');
  const [mediumUsername, setMediumUsername] = createSignal('');
  const [mediumCount, setMediumCount] = createSignal(3);
  const [mediumTheme, setMediumTheme] = createSignal('dark');
  const [capsuleType, setCapsuleType] = createSignal<CapsuleShape>('waving');
  const [capsuleSection, setCapsuleSection] = createSignal<'header' | 'footer'>('header');
  const [capsuleHeight, setCapsuleHeight] = createSignal(150);
  const [capsuleTheme, setCapsuleTheme] = createSignal('cobalt');
  const [capsuleColor, setCapsuleColor] = createSignal('');
  const [capsuleText, setCapsuleText] = createSignal('Welcome');
  const [capsuleDescription, setCapsuleDescription] = createSignal('Developer profile');
  const [capsuleAnimation, setCapsuleAnimation] = createSignal('fadeIn');
  const [capsuleFontColor, setCapsuleFontColor] = createSignal('ffffff');
  const [capsuleFontSize, setCapsuleFontSize] = createSignal(52);
  const [capsuleReverse, setCapsuleReverse] = createSignal(false);

  // Real contribution matrix state
  const [realMatrix, setRealMatrix] = createSignal<ContributionMatrix | null>(null);
  const [loadingContributions, setLoadingContributions] = createSignal(false);

  createEffect(
    () => [props.currentUser?.login, username()] as const,
    ([currentUsername, configuredUsername]) => {
      if (currentUsername && !configuredUsername) setUsername(currentUsername);
    },
  );

  createEffect(
    () => [username().trim() || props.currentUser?.login, props.tool, props.sessionToken] as const,
    ([targetUser, tool, sessionToken]) => {
      if (!targetUser) {
        setRealMatrix(null);
        return;
      }

      if (['snake', 'arcade'].includes(tool)) {
        setLoadingContributions(true);
        fetchRealGitHubContributions(targetUser, sessionToken)
          .then((matrix) => setRealMatrix(matrix))
          .catch(() => setRealMatrix(null))
          .finally(() => setLoadingContributions(false));
      }
    },
  );

  const effectiveUsername = createMemo(() => username().trim() || props.currentUser?.login || 'octocat');

  const generatedMarkdown = createMemo(() => {
    switch (props.tool) {
      case 'profile-image':
        return buildImageMarkdown({ url: imageUrl(), alt: imageAlt(), height: imageHeight(), align: align() });
      case 'profile-text':
        return buildTextMarkdown({ text: profileText(), tag: textTag(), align: align() });
      case 'tech-stack':
        return buildTechStackMarkdown({
          technologies: technologies().split(',').map((technology) => technology.trim()),
          provider: techProvider(),
          align: align(),
        });
      case 'social-links':
        return buildSocialLinksMarkdown({ links: socialLinks(), align: align(), style: socialStyle() });
      case 'github-stats':
        return buildGitHubStatsMarkdown({
          username: effectiveUsername(),
          cards: selectedStats(),
          theme: statsTheme(),
          locale: statsLocale(),
          hideBorder: hideBorder(),
          hideTitle: hideTitle(),
          languagesCount: languagesCount(),
          align: align(),
        });
      case 'profile-views':
        return buildProfileViewsMarkdown({
          username: effectiveUsername(),
          provider: viewProvider(),
          label: viewLabel(),
          leftColor: leftColor(),
          rightColor: rightColor(),
          align: align(),
        });
      case 'snake':
        return buildSnakeMarkdown(effectiveUsername());
      case 'arcade':
        return buildArcadeMarkdown(effectiveUsername(), arcadeGame());
      case 'medium':
        return buildMediumMarkdown({ username: mediumUsername(), count: mediumCount(), theme: mediumTheme(), align: align() });
      case 'capsule':
        return buildCapsuleMarkdown({
          type: capsuleType(),
          section: capsuleSection(),
          height: capsuleHeight(),
          theme: capsuleTheme(),
          color: capsuleColor(),
          text: capsuleText(),
          description: capsuleDescription(),
          animation: capsuleAnimation(),
          fontColor: capsuleFontColor(),
          fontSize: capsuleFontSize(),
          reverse: capsuleReverse(),
        });
      case 'profile-template':
        return '';
    }
  });

  const needsUsername = () => ['github-stats', 'profile-views', 'snake', 'arcade'].includes(props.tool);

  function toggleStatsCard(card: StatsCard, checked: boolean): void {
    setSelectedStats((current) => checked ? [...current, card] : current.filter((item) => item !== card));
  }

  function updateSocialLink(value: string): void {
    setSocialLinks((current) => ({ ...current, [socialPlatform()]: value }));
  }

  function insertGenerated(): void {
    const generated = generatedMarkdown();
    if (generated) props.onInsert(generated);
  }

  return (
    <div class="profile-tool">
      <Show when={props.tool === 'profile-template'}>
        <p class="inspector-description">Start from a complete profile README. Enter a GitHub username first; choosing a template replaces the current document.</p>
        <label>GitHub username<input value={username()} placeholder={props.currentUser?.login ?? 'octocat'} onInput={(event) => setUsername(event.currentTarget.value)} /></label>
        <div class="template-list">
          {PROFILE_TEMPLATES.map((template) => (
            <button disabled={!effectiveUsername()} onClick={() => props.onReplace(template.build(effectiveUsername()))}>
              <strong>{template.name}</strong>
              <span>{template.description}</span>
            </button>
          ))}
        </div>
      </Show>

      <Show when={props.tool !== 'profile-template'}>
        <Show when={needsUsername()}>
          <label>GitHub username<input value={username()} placeholder={props.currentUser?.login ?? 'octocat'} onInput={(event) => setUsername(event.currentTarget.value)} /></label>
        </Show>

        <Show when={props.tool === 'profile-image'}>
          <label>Image or GIF URL<input value={imageUrl()} onInput={(event) => setImageUrl(event.currentTarget.value)} /></label>
          <div class="field-row"><label>Alt text<input value={imageAlt()} onInput={(event) => setImageAlt(event.currentTarget.value)} /></label><label>Height (px)<input type="number" min="40" max="600" value={imageHeight()} onInput={(event) => setImageHeight(event.currentTarget.valueAsNumber || 40)} /></label></div>
        </Show>

        <Show when={props.tool === 'profile-text'}>
          <label>Profile text<textarea value={profileText()} onInput={(event) => setProfileText(event.currentTarget.value)} /></label>
          <label>HTML tag<select value={textTag()} onChange={(event) => setTextTag(event.currentTarget.value as TextTag)}><option value="h1">H1 Heading</option><option value="h2">H2 Subtitle</option><option value="h3">H3 Section</option><option value="p">Paragraph</option></select></label>
        </Show>

        <Show when={props.tool === 'tech-stack'}>
          <label>Technologies (comma separated)<textarea value={technologies()} onInput={(event) => setTechnologies(event.currentTarget.value)} /></label>
          <label>Icon provider<select value={techProvider()} onChange={(event) => setTechProvider(event.currentTarget.value as TechProvider)}>{TECH_PROVIDERS.map((provider) => <option value={provider}>{provider}</option>)}</select></label>
        </Show>

        <Show when={props.tool === 'social-links'}>
          <label>Platform<select value={socialPlatform()} onChange={(event) => setSocialPlatform(event.currentTarget.value as SocialPlatformId)}>{SOCIAL_PLATFORMS.map((platform) => <option value={platform.id}>{platform.label}</option>)}</select></label>
          <label>Profile link or username<input value={socialLinks()[socialPlatform()] ?? ''} placeholder="username or full URL" onInput={(event) => updateSocialLink(event.currentTarget.value)} /></label>
          <label>Visual style<select value={socialStyle()} onChange={(event) => setSocialStyle(event.currentTarget.value as 'icons' | 'badges')}><option value="icons">Skill Icons</option><option value="badges">Shields Badges</option></select></label>
          <Show when={Object.keys(socialLinks()).length}>
            <div class="configured-items">{Object.entries(socialLinks()).filter(([, value]) => Boolean(value)).map(([key, value]) => <span>{key}: {value}</span>)}</div>
          </Show>
        </Show>

        <Show when={props.tool === 'github-stats'}>
          <div class="option-checks">{statsCards.map((card) => <label><input type="checkbox" checked={selectedStats().includes(card.id)} onChange={(event) => toggleStatsCard(card.id, event.currentTarget.checked)} />{card.label}</label>)}</div>
          <div class="field-row"><label>Theme<input value={statsTheme()} onInput={(event) => setStatsTheme(event.currentTarget.value)} /></label><label>Locale<input value={statsLocale()} onInput={(event) => setStatsLocale(event.currentTarget.value)} /></label></div>
          <label>Language count<input type="number" min="1" max="20" value={languagesCount()} onInput={(event) => setLanguagesCount(event.currentTarget.valueAsNumber || 1)} /></label>
          <div class="option-checks compact"><label><input type="checkbox" checked={hideBorder()} onChange={(event) => setHideBorder(event.currentTarget.checked)} />Hide border</label><label><input type="checkbox" checked={hideTitle()} onChange={(event) => setHideTitle(event.currentTarget.checked)} />Hide title</label></div>
        </Show>

        <Show when={props.tool === 'profile-views'}>
          <label>Provider<select value={viewProvider()} onChange={(event) => setViewProvider(event.currentTarget.value as 'laobi' | 'getloli')}><option value="laobi">Laobi badge</option><option value="getloli">GetLoli counter</option></select></label>
          <Show when={viewProvider() === 'laobi'}><label>Label<input value={viewLabel()} onInput={(event) => setViewLabel(event.currentTarget.value)} /></label><div class="field-row"><label>Left color<input value={leftColor()} onInput={(event) => setLeftColor(event.currentTarget.value)} /></label><label>Right color<input value={rightColor()} onInput={(event) => setRightColor(event.currentTarget.value)} /></label></div></Show>
        </Show>

        <Show when={props.tool === 'snake'}>
          <div class="preview-header-meta">
            <Show when={realMatrix()}>
              <span class="live-activity-badge">● Real GitHub activity loaded</span>
            </Show>
            <Show when={loadingContributions()}>
              <span class="loading-activity-badge">Loading activity…</span>
            </Show>
          </div>
          <p class="workflow-note"><strong>Requires workflow</strong>Export will include <code>.github/workflows/snake.yml</code>.</p>
          <div class="game-live-preview" innerHTML={generateSnakeSvg({ username: effectiveUsername(), theme: 'dark', matrix: realMatrix() ?? undefined })} />
        </Show>

        <Show when={props.tool === 'arcade'}>
          <label>Game<select value={arcadeGame()} onChange={(event) => setArcadeGame(event.currentTarget.value as ArcadeGame)}>{ARCADE_GAMES.map((game) => <option value={game.id}>{game.label}</option>)}</select></label>
          <div class="preview-header-meta">
            <Show when={realMatrix()}>
              <span class="live-activity-badge">● Real GitHub activity loaded</span>
            </Show>
            <Show when={loadingContributions()}>
              <span class="loading-activity-badge">Loading activity…</span>
            </Show>
          </div>
          <p class="workflow-note"><strong>Requires workflow</strong>Export will include <code>.github/workflows/arcade.yml</code>.</p>
          <div class="game-live-preview" innerHTML={getGameSvg(arcadeGame(), { username: effectiveUsername(), theme: 'dark', matrix: realMatrix() ?? undefined })} />
        </Show>

        <Show when={props.tool === 'medium'}>
          <label>Medium username<input value={mediumUsername()} placeholder="without @" onInput={(event) => setMediumUsername(event.currentTarget.value)} /></label>
          <div class="field-row"><label>Article count<input type="number" min="1" max="10" value={mediumCount()} onInput={(event) => setMediumCount(event.currentTarget.valueAsNumber || 1)} /></label><label>Theme<input value={mediumTheme()} onInput={(event) => setMediumTheme(event.currentTarget.value)} /></label></div>
        </Show>

        <Show when={props.tool === 'capsule'}>
          <div class="field-row"><label>Shape<select value={capsuleType()} onChange={(event) => setCapsuleType(event.currentTarget.value as CapsuleShape)}>{CAPSULE_SHAPES.map((shape) => <option value={shape}>{shape}</option>)}</select></label><label>Section<select value={capsuleSection()} onChange={(event) => setCapsuleSection(event.currentTarget.value as 'header' | 'footer')}><option value="header">Header</option><option value="footer">Footer</option></select></label></div>
          <label>Title<input value={capsuleText()} onInput={(event) => setCapsuleText(event.currentTarget.value)} /></label>
          <label>Description<input value={capsuleDescription()} onInput={(event) => setCapsuleDescription(event.currentTarget.value)} /></label>
          <div class="field-row"><label>Theme<input value={capsuleTheme()} onInput={(event) => setCapsuleTheme(event.currentTarget.value)} /></label><label>Custom color<input value={capsuleColor()} placeholder="optional" onInput={(event) => setCapsuleColor(event.currentTarget.value)} /></label></div>
          <div class="field-row"><label>Height<input type="number" min="40" value={capsuleHeight()} onInput={(event) => setCapsuleHeight(event.currentTarget.valueAsNumber || 40)} /></label><label>Font size<input type="number" min="8" value={capsuleFontSize()} onInput={(event) => setCapsuleFontSize(event.currentTarget.valueAsNumber || 8)} /></label></div>
          <div class="field-row"><label>Animation<input value={capsuleAnimation()} onInput={(event) => setCapsuleAnimation(event.currentTarget.value)} /></label><label>Font color<input value={capsuleFontColor()} onInput={(event) => setCapsuleFontColor(event.currentTarget.value)} /></label></div>
          <div class="option-checks compact"><label><input type="checkbox" checked={capsuleReverse()} onChange={(event) => setCapsuleReverse(event.currentTarget.checked)} />Reverse shape</label></div>
        </Show>

        <Show when={!['snake', 'arcade'].includes(props.tool)}>
          <label>Alignment<select value={align()} onChange={(event) => setAlign(event.currentTarget.value as Alignment)}>{alignmentOptions.map((option) => <option value={option}>{option}</option>)}</select></label>
        </Show>

        <pre class="snippet-preview">{generatedMarkdown() || 'Complete the required fields to generate this block.'}</pre>
        <button class="wide-action" disabled={!generatedMarkdown()} onClick={insertGenerated}>Insert at cursor</button>
      </Show>
    </div>
  );
}
