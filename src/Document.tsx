import type { ParentProps } from 'solid-js';
import { HydrationScript } from '@solidjs/web';

export default function Document(props: ParentProps) {
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://github.com/0ctacity#organization',
        name: 'Octacity',
        url: 'https://github.com/0ctacity',
        sameAs: ['https://github.com/0ctacity'],
      },
      {
        '@type': 'WebApplication',
        '@id': 'https://0ctacity.github.io/readme-studio/#webapp',
        name: 'Readme Studio',
        alternateName: ['Readme Studio by Octacity', '0ctacity Readme Studio'],
        url: 'https://0ctacity.github.io/readme-studio/',
        description: 'A fast, private, browser-based visual Markdown editor for creating polished GitHub repository and profile READMEs by Octacity.',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any (Web Browser)',
        browserRequirements: 'Requires JavaScript and a modern web browser',
        softwareVersion: '1.0.0',
        license: 'https://opensource.org/licenses/MIT',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        author: {
          '@id': 'https://github.com/0ctacity#organization',
        },
        publisher: {
          '@id': 'https://github.com/0ctacity#organization',
        },
        featureList: [
          'Real-time GitHub Flavored Markdown (GFM) editing with live sanitized preview',
          'Shields.io custom and dynamic badge builder',
          'GitHub Profile README tools (Capsule Render, Contribution Snake, Retro Arcade animations)',
          'GitHub statistics, top languages, and streak widgets',
          'Directory tree generator and automatic Table of Contents',
          'Zero-server client-side local persistence',
        ],
      },
    ],
  });

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Readme Studio by Octacity — Build better GitHub READMEs</title>
        <meta name="description" content="A fast, private, browser-based visual Markdown editor for polished GitHub repository and profile READMEs by Octacity." />
        <meta name="author" content="Octacity" />
        <meta name="publisher" content="Octacity" />
        <meta name="brand" content="Octacity" />
        <meta name="keywords" content="Readme Studio, Octacity, GitHub README editor, Profile README, Markdown editor, Shields.io badges, SolidJS" />
        <meta name="theme-color" content="#17211c" />

        {/* Canonical & Agent Alternate links */}
        <link rel="canonical" href="https://0ctacity.github.io/readme-studio/" />
        <link rel="alternate" type="text/markdown" href="https://0ctacity.github.io/readme-studio/llms.txt" title="Agent documentation in Markdown (llms.txt)" />
        <link rel="alternate" type="text/markdown" href="https://0ctacity.github.io/readme-studio/README.md" title="Project README in Markdown" />
        <link rel="help" type="text/markdown" href="https://0ctacity.github.io/readme-studio/llms.txt" />
        <link rel="sitemap" type="application/xml" href="https://0ctacity.github.io/readme-studio/sitemap.xml" />
        <link rel="icon" href="/readme-studio/favicon.ico" />

        {/* OpenGraph & Social Discoverability */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Readme Studio by Octacity — Build better GitHub READMEs" />
        <meta property="og:description" content="A fast, private, browser-based visual Markdown editor for polished GitHub repository and profile READMEs by Octacity." />
        <meta property="og:url" content="https://0ctacity.github.io/readme-studio/" />
        <meta property="og:site_name" content="Readme Studio by Octacity" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Readme Studio by Octacity" />
        <meta name="twitter:description" content="A fast, private, browser-based visual Markdown editor for polished GitHub repository and profile READMEs by Octacity." />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json" innerHTML={jsonLd} />

        <HydrationScript />
      </head>
      <body>
        {props.children}
        <noscript>
          <main style="max-width: 800px; margin: 40px auto; padding: 24px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #17211c; background: #fbfaf5;">
            <h1>Readme Studio — Interactive GitHub README & Profile Editor by Octacity</h1>
            <p>Readme Studio by Octacity is a fast, browser-based visual Markdown editor designed for building polished, professional GitHub repository and user profile README documents.</p>

            <h2>Core Features</h2>
            <ul>
              <li><strong>Real-Time Markdown Editing:</strong> Write GitHub Flavored Markdown (GFM) with instant sanitized preview, document quality checks, and local auto-save persistence.</li>
              <li><strong>Shields.io Badge Builder:</strong> Configure live CI/CD status badges, version indicators, npm downloads, code coverage badges, license labels, and Discord community counters.</li>
              <li><strong>GitHub Profile Suite:</strong> Generate dynamic Capsule Render banners, Contribution Snake animations, retro Arcade contribution graphs (Pac-Man, Breakout, Galaga, Puzzle Bobble, Bomberman), GitHub stats cards, and tech stack icon rows.</li>
              <li><strong>Productivity Utilities:</strong> Instant project directory tree generator and automated slug-anchored Table of Contents builder.</li>
            </ul>

            <h2>Agent & Machine-Readable Resources</h2>
            <p>If you are an AI agent or crawler, access our machine-readable specifications:</p>
            <ul>
              <li><a href="/readme-studio/llms.txt">Agent Guide (llms.txt)</a></li>
              <li><a href="/readme-studio/llms-full.txt">Full Technical Agent Documentation (llms-full.txt)</a></li>
              <li><a href="/readme-studio/sitemap.xml">XML Sitemap</a></li>
              <li><a href="/readme-studio/README.md">Raw Markdown Documentation</a></li>
              <li><a href="https://github.com/0ctacity/readme-studio">GitHub Repository (Octacity)</a></li>
            </ul>
          </main>
        </noscript>
      </body>
    </html>
  );
}
