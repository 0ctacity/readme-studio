import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';

describe('Agent readiness & Discoverability', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const publicDir = path.join(rootDir, 'public');

  test('llms.txt and llms-full.txt exist and follow llmstxt specifications', () => {
    const llmsTxt = fs.readFileSync(path.join(publicDir, 'llms.txt'), 'utf-8');
    expect(llmsTxt).toStartWith('# Readme Studio by Octacity');
    expect(llmsTxt).toContain('## Core Resources');
    expect(llmsTxt).toContain('https://0ctacity.github.io/readme-studio/');
    expect(llmsTxt).toContain('llms-full.txt');

    const llmsFull = fs.readFileSync(path.join(publicDir, 'llms-full.txt'), 'utf-8');
    expect(llmsFull).toContain('# Readme Studio by Octacity — Full Agent Documentation');
    expect(llmsFull).toContain('## Project Overview');
    expect(llmsFull).toContain('Octacity');
  });

  test('404.html provides recovery navigation and markdown block for agents', () => {
    const errorPage = fs.readFileSync(path.join(publicDir, '404.html'), 'utf-8');
    expect(errorPage).toContain('404 Not Found');
    expect(errorPage).toContain('Octacity');
    expect(errorPage).toContain('https://0ctacity.github.io/readme-studio/llms.txt');
    expect(errorPage).toContain('https://0ctacity.github.io/readme-studio/sitemap.xml');
  });

  test('robots.txt and sitemap.xml are configured correctly', () => {
    const robots = fs.readFileSync(path.join(publicDir, 'robots.txt'), 'utf-8');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Sitemap: https://0ctacity.github.io/readme-studio/sitemap.xml');

    const sitemap = fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('https://0ctacity.github.io/readme-studio/</loc>');
    expect(sitemap).toContain('https://0ctacity.github.io/readme-studio/llms.txt</loc>');
  });

  test('Document.tsx renders rich semantic content, JSON-LD, and alternate markdown links', () => {
    const docSource = fs.readFileSync(path.resolve(__dirname, '../Document.tsx'), 'utf-8');
    expect(docSource).toContain('Octacity');
    expect(docSource).toContain('application/ld+json');
    expect(docSource).toContain('type="text/markdown"');
    expect(docSource).toContain('llms.txt');
    expect(docSource).toContain('<noscript>');
    expect(docSource).toContain('<h1>Readme Studio — Interactive GitHub README & Profile Editor by Octacity</h1>');
  });
});
