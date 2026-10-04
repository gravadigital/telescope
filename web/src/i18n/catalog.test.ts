/** @jest-environment node */
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { es } from './catalogs/es';
import { en } from './catalogs/en';
import { findGenderMarks, findVoseo } from './neutral-spanish';
import type { StageAdvanceIssue } from '../domain/stages';

type Tree = { [key: string]: unknown };

const flattenLeaves = (node: unknown, prefix = ''): Array<[string, string]> => {
  if (typeof node === 'string') return [[prefix, node]];
  if (node && typeof node === 'object') {
    const obj = node as Tree;
    if (obj.__plural === true) {
      return [
        [`${prefix}.one`, obj.one as string],
        [`${prefix}.other`, obj.other as string],
      ];
    }
    return Object.entries(obj).flatMap(([k, v]) => flattenLeaves(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
};

const NOT_ERROR_CODES = ['GOOGLE_CLIENT_ID'];

const collectApiCodes = (): Set<string> => {
  const file = path.resolve(__dirname, '../../../docs/apis/api.yaml');
  const doc = YAML.parse(fs.readFileSync(file, 'utf8'));
  const codes = new Set<string>();
  const scan = (description: unknown) => {
    if (typeof description !== 'string') return;
    (description.match(/`[A-Z][A-Z0-9_]+`/g) ?? []).forEach((m) => codes.add(m.slice(1, -1)));
  };
  for (const operations of Object.values(doc.paths as Record<string, Tree>)) {
    for (const op of Object.values(operations as Record<string, Tree>)) {
      const responses = (op && (op.responses as Tree)) || {};
      for (const [status, response] of Object.entries(responses as Record<string, Tree>)) {
        if (Number(status) < 400) continue;
        let resolved = response;
        if (typeof response.$ref === 'string') {
          resolved = doc.components.responses[response.$ref.split('/').pop() as string];
        }
        scan(resolved.description);
      }
    }
  }
  (doc.components.schemas.MiddlewareError.properties.error.enum as string[]).forEach((c) => codes.add(c));
  NOT_ERROR_CODES.forEach((c) => codes.delete(c));
  return codes;
};

describe('catálogo', () => {
  it('TS-23: cubre todos los códigos de api.yaml', () => {
    const codes = collectApiCodes();
    expect(codes.size).toBe(104);
    ['EVENT_NOT_FOUND', 'UNAUTHORIZED', 'FORBIDDEN', 'INSUFFICIENT_ATTACHMENTS'].forEach((c) =>
      expect(codes.has(c)).toBe(true)
    );
    for (const catalog of [es, en]) {
      const errors = catalog.errors as Record<string, string>;
      for (const code of Array.from(codes)) {
        expect(typeof errors[code]).toBe('string');
        expect(errors[code].length).toBeGreaterThan(0);
        expect(errors[code]).not.toBe(code);
      }
      expect(errors.generic).toBeTruthy();
      expect(errors.network).toBeTruthy();
    }
  });

  it('TS-24: códigos de dominio traducidos', () => {
    const issues: StageAdvanceIssue[] = [
      'INVALID_TRANSITION',
      'MISSING_ESTIMATED_DATE',
      'INVALID_ESTIMATED_DATE',
      'INSUFFICIENT_ATTACHMENTS',
    ];
    issues.forEach((code) => {
      expect(Object.keys(es.errors)).toContain(code);
      expect(Object.keys(en.errors)).toContain(code);
    });
  });

  it('TS-25: el catálogo es no tiene voseo', () => {
    const offenders = flattenLeaves(es).flatMap(([key, text]) =>
      findVoseo(text).map((form) => `${key}: "${form}"`)
    );
    expect(offenders).toEqual([]);
  });

  it('TS-27: el catálogo es no tiene marcas de género', () => {
    const offenders = flattenLeaves(es).flatMap(([key, text]) =>
      findGenderMarks(text).map((mark) => `${key}: "${mark}"`)
    );
    expect(offenders).toEqual([]);
  });

  it('TS-7: namespace auth neutro y con los ejemplos de CA-13', () => {
    expect(es.auth.login.noAccount).toBe('¿No tienes cuenta?');
    expect(es.auth.login.createOne).toBe('Crea una gratis');
    expect(es.auth.login.brandTitle).toBe('Vuelve a donde dejaste tus eventos.');
    expect(es.auth.completeProfile.title).toBe('Elige tu nombre');
    expect(en.auth.login.createOne).toBe('Create one for free');
    const leaves = flattenLeaves(es.auth);
    expect(leaves.length).toBe(75);
    leaves.forEach(([key, text]) => {
      expect(findVoseo(text)).toEqual([]);
      expect(findGenderMarks(text)).toEqual([]);
      expect(key).toBeTruthy();
    });
  });

  it('es y en tienen las mismas hojas', () => {
    expect(flattenLeaves(en).map(([k]) => k)).toEqual(flattenLeaves(es).map(([k]) => k));
  });
});
