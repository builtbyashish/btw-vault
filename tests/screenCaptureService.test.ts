import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ScreenCaptureService } from '../src/core/security/screenCaptureService';

describe('ScreenCaptureService Security & State Tests', () => {
  beforeEach(() => {
    ScreenCaptureService.resetMemoryState();
  });

  it('defaults to false (protected) when no storage key exists', async () => {
    const allowed = await ScreenCaptureService.isScreenshotsAllowed();
    assert.strictEqual(allowed, false, 'Screenshots must be disabled by default');
  });

  it('correctly sets and persists allowScreenshots to true', async () => {
    await ScreenCaptureService.setScreenshotsAllowed(true);
    const allowed = await ScreenCaptureService.isScreenshotsAllowed();
    assert.strictEqual(allowed, true);
  });

  it('correctly sets and persists allowScreenshots back to false', async () => {
    await ScreenCaptureService.setScreenshotsAllowed(true);
    await ScreenCaptureService.setScreenshotsAllowed(false);
    const allowed = await ScreenCaptureService.isScreenshotsAllowed();
    assert.strictEqual(allowed, false);
  });

  it('runs syncOnStartup safely without throwing', async () => {
    await assert.doesNotReject(async () => {
      await ScreenCaptureService.syncOnStartup();
    });
  });
});
