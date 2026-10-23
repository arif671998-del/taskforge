/**
 * The sample guide, text only. Illustrations are added in a later milestone.
 * It is generic on purpose: no real app names, logos or screenshots.
 * Hindi text is for native-speaker review.
 */
import { createGuide, createStep } from './guide.js';

const SAMPLES = {
  en: {
    title: 'Sample: Join a video call',
    steps: [
      { text: 'Open the message from your family. Find the link to the call.' },
      { text: 'Tap the link once. Wait a few seconds.', expected: 'A screen that says Join, or a preview of your own face.' },
      { text: 'If the phone asks to use the camera and microphone, tap Allow.', caution: true },
      { text: 'Tap the big Join button.' },
      { text: 'You can now see your family. If they cannot hear you, check that the microphone is not crossed out.' },
      { text: 'When you are finished, tap the red button to leave the call.' },
    ],
  },
  hi: {
    title: 'नमूना: वीडियो कॉल से जुड़ना',
    steps: [
      { text: 'परिवार का भेजा हुआ मैसेज खोलिए। उसमें कॉल का लिंक ढूँढिए।' },
      { text: 'लिंक पर एक बार दबाइए। कुछ सेकंड रुकिए।', expected: 'एक स्क्रीन जिस पर "Join" लिखा हो, या आपके अपने चेहरे की झलक।' },
      { text: 'अगर फ़ोन कैमरा और माइक इस्तेमाल करने की इजाज़त माँगे, तो "Allow" दबाइए।', caution: true },
      { text: 'बड़े "Join" बटन को दबाइए।' },
      { text: 'अब आपको परिवार दिखेगा। अगर उन्हें आपकी आवाज़ न आए, तो देखिए कि माइक पर कटी हुई लाइन तो नहीं है।' },
      { text: 'बात पूरी होने पर लाल बटन दबाकर कॉल छोड़ दीजिए।' },
    ],
  },
};

/**
 * Build a fresh sample guide.
 * @param {'en'|'hi'} language language of the sample text
 * @returns {object}
 */
export function createSampleGuide(language = 'en') {
  const sample = SAMPLES[language] ?? SAMPLES.en;
  return createGuide({
    title: sample.title,
    language: SAMPLES[language] ? language : 'en',
    isSample: true,
    steps: sample.steps.map((s) => createStep(s)),
  });
}
