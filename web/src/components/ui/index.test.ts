import * as UI from '.';

describe('barrel de primitivos', () => {
  it('TS-11: expone los 15 primitivos', () => {
    const names = [
      'Button',
      'TextField',
      'Dialog',
      'DataTable',
      'FilterTabs',
      'StatusPill',
      'StatTile',
      'Callout',
      'EmptyState',
      'Card',
      'ProgressBar',
      'NumberStepper',
      'DateQuickPicker',
      'FileDropzone',
      'Menu',
    ] as const;
    names.forEach((name) => {
      const component = (UI as Record<string, unknown>)[name];
      expect(['function', 'object']).toContain(typeof component);
      expect(component).toBeTruthy();
    });
  });
});
