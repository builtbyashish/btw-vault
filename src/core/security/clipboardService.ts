import * as Clipboard from 'expo-clipboard';
import { HapticService } from '../haptics';

export class ClipboardService {
  private static timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Copy sensitive string to clipboard and schedule auto-clear in N seconds
   */
  static async copyWithAutoClear(text: string, clearAfterSeconds: number = 30): Promise<void> {
    await Clipboard.setStringAsync(text);
    HapticService.copy();

    if (ClipboardService.timer) {
      clearTimeout(ClipboardService.timer);
    }

    ClipboardService.timer = setTimeout(async () => {
      try {
        const currentText = await Clipboard.getStringAsync();
        if (currentText === text) {
          await Clipboard.setStringAsync('');
        }
      } catch {
        // Ignore clipboard clear errors
      }
    }, clearAfterSeconds * 1000);
  }
}
