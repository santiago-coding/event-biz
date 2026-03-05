import type { Page } from "playwright";

export interface CaptchaDetection {
  detected: boolean;
  type: "recaptcha" | "hcaptcha" | "generic" | null;
}

export async function detectCaptcha(page: Page): Promise<CaptchaDetection> {
  const content = await page.content();

  if (/recaptcha/i.test(content)) {
    return { detected: true, type: "recaptcha" };
  }
  if (/hcaptcha/i.test(content)) {
    return { detected: true, type: "hcaptcha" };
  }
  if (/captcha/i.test(content)) {
    return { detected: true, type: "generic" };
  }

  return { detected: false, type: null };
}
