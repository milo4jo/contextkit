import { describe, it, expect } from 'vitest';
import { getPreset, getPresetNames, getPresetList, presetToYaml, PRESETS } from '../src/config/presets.js';

describe('Config Presets', () => {
  describe('getPresetNames', () => {
    it('should return all preset names', () => {
      const names = getPresetNames();
      expect(names).toContain('react');
      expect(names).toContain('node');
      expect(names).toContain('python');
      expect(names).toContain('monorepo');
      expect(names).toContain('fullstack');
      expect(names.length).toBe(5);
    });
  });

  describe('getPreset', () => {
    it('should return preset by name', () => {
      const preset = getPreset('react');
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('React / Next.js');
    });

    it('should be case-insensitive', () => {
      expect(getPreset('React')).toEqual(getPreset('react'));
      expect(getPreset('PYTHON')).toEqual(getPreset('python'));
    });

    it('should return undefined for unknown preset', () => {
      expect(getPreset('unknown')).toBeUndefined();
      expect(getPreset('')).toBeUndefined();
    });
  });

  describe('getPresetList', () => {
    it('should return list with names and descriptions', () => {
      const list = getPresetList();
      expect(list.length).toBe(5);
      expect(list[0]).toHaveProperty('name');
      expect(list[0]).toHaveProperty('description');
    });
  });

  describe('presetToYaml', () => {
    it('should generate valid YAML for react preset', () => {
      const preset = getPreset('react')!;
      const yaml = presetToYaml(preset);
      
      expect(yaml).toContain('version: 1');
      expect(yaml).toContain('Preset: React / Next.js');
      expect(yaml).toContain('sources:');
      expect(yaml).toContain('id: app');
      expect(yaml).toContain('path: ./src');
      expect(yaml).toContain('**/*.tsx');
      expect(yaml).toContain('chunk_size: 400');
    });

    it('should generate valid YAML for monorepo preset', () => {
      const preset = getPreset('monorepo')!;
      const yaml = presetToYaml(preset);
      
      expect(yaml).toContain('id: packages');
      expect(yaml).toContain('id: apps');
      expect(yaml).toContain('path: ./packages');
      expect(yaml).toContain('path: ./apps');
    });

    it('should include exclude patterns', () => {
      const preset = getPreset('node')!;
      const yaml = presetToYaml(preset);
      
      expect(yaml).toContain('exclude:');
      expect(yaml).toContain('**/node_modules/**');
      expect(yaml).toContain('**/*.test.ts');
    });
  });

  describe('PRESETS', () => {
    it('react preset has correct structure', () => {
      const preset = PRESETS.react;
      expect(preset.sources).toHaveLength(1);
      expect(preset.sources[0].id).toBe('app');
      expect(preset.sources[0].patterns.include).toContain('**/*.tsx');
      expect(preset.sources[0].patterns.exclude).toContain('**/__tests__/**');
    });

    it('python preset has Python-specific patterns', () => {
      const preset = PRESETS.python;
      expect(preset.sources[0].patterns.include).toContain('**/*.py');
      expect(preset.sources[0].patterns.exclude).toContain('**/__pycache__/**');
      expect(preset.sources[0].patterns.exclude).toContain('**/.venv/**');
    });

    it('monorepo preset has multiple sources', () => {
      const preset = PRESETS.monorepo;
      expect(preset.sources).toHaveLength(2);
      expect(preset.sources.map(s => s.id)).toEqual(['packages', 'apps']);
    });

    it('fullstack preset has frontend and api sources', () => {
      const preset = PRESETS.fullstack;
      expect(preset.sources).toHaveLength(2);
      expect(preset.sources.map(s => s.id)).toContain('frontend');
      expect(preset.sources.map(s => s.id)).toContain('api');
    });

    it('all presets have valid settings', () => {
      for (const [name, preset] of Object.entries(PRESETS)) {
        expect(preset.settings.chunk_size).toBeGreaterThan(0);
        expect(preset.settings.chunk_overlap).toBeGreaterThanOrEqual(0);
        expect(preset.settings.chunk_overlap).toBeLessThan(preset.settings.chunk_size);
        expect(preset.name).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(preset.sources.length).toBeGreaterThan(0);
      }
    });
  });
});
