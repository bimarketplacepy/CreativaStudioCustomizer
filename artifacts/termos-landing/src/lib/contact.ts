/** Business contact details, kept in one place so every CTA stays in sync. */
export const WHATSAPP_PHONE = "595971300945";
export const WHATSAPP_PHONE_DISPLAY = "+595 971 300 945";
export const EMAIL = "lacreativaparaguay@gmail.com";
export const ADDRESS = "Local dentro de Marketplace, Avda. España";
export const INSTAGRAM_HANDLE = "creativastudio.py";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}`;
export const FACEBOOK_URL = "https://www.facebook.com/lacreativa.paraguay";

/** wa.me deep link. Opens the chat with an optional prefilled message. */
export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_PHONE}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
