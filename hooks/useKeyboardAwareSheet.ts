/**
 * DESIGN RULE: Keyboard-Aware Bottom Sheets
 *
 * For any bottom sheet or modal that contains text inputs, follow these rules
 * to ensure the input field and submit button remain visible above the keyboard.
 *
 * RECOMMENDED APPROACH (Simple & Reliable):
 * Use a fixed high snap point (75-85%) that ensures content is always visible.
 *
 * @example
 * ```tsx
 * import {
 *   BottomSheetModal,
 *   BottomSheetView,
 *   BottomSheetTextInput,
 * } from '@gorhom/bottom-sheet';
 *
 * function MyInputSheet() {
 *   const snapPoints = ['85%']; // High enough to show content above keyboard
 *
 *   return (
 *     <BottomSheetModal
 *       snapPoints={snapPoints}
 *       enablePanDownToClose
 *       keyboardBehavior="interactive"
 *       keyboardBlurBehavior="restore"
 *       android_keyboardInputMode="adjustResize"
 *     >
 *       <BottomSheetView style={{ flex: 1, padding: 16 }}>
 *         <BottomSheetTextInput
 *           style={{ flex: 1 }}
 *           placeholder="Type here..."
 *           multiline
 *         />
 *         <Button title="Submit" />
 *       </BottomSheetView>
 *     </BottomSheetModal>
 *   );
 * }
 * ```
 *
 * KEY CONFIGURATION:
 * 1. snapPoints={['85%']} - Use a high snap point (75-85%)
 * 2. keyboardBehavior="interactive" - Sheet follows keyboard
 * 3. keyboardBlurBehavior="restore" - Returns to position when keyboard closes
 * 4. android_keyboardInputMode="adjustResize" - Proper Android keyboard handling
 * 5. Use BottomSheetTextInput instead of TextInput
 * 6. Use flex: 1 on container and input for proper layout
 *
 * WHY THIS WORKS:
 * - The modal starts at 85% height, so when keyboard opens (typically ~40% of screen),
 *   the content is already positioned above where the keyboard will appear
 * - keyboardBehavior="interactive" makes the sheet adjust smoothly with keyboard
 * - android_keyboardInputMode="adjustResize" ensures Android handles it correctly
 *
 * AVOID:
 * - enableDynamicSizing - Can cause content to collapse on Android
 * - KeyboardAvoidingView wrapper - @gorhom/bottom-sheet handles this internally
 * - Low snap points (< 70%) - Content may be hidden by keyboard
 */

export {};
