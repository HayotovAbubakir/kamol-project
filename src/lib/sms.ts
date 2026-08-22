import { extractUzbekMobileDigits } from '@/lib/utils';

/**
 * SMS yuborish (Eskiz / Playmobile / Twilio).
 * `.env` ga `SMS_PROVIDER` kalitlari va raqamlarni qo'shing.
 */
export async function sendSms(phone: string | undefined, text: string): Promise<void> {
  const digits = extractUzbekMobileDigits(phone);
  const to = digits ? `998${digits}` : phone?.replace(/\D/g, '');

  if (!to) {
    return;
  }

  // TODO: SMS provayder API chaqiruvi (masalan Eskiz sendSms)
  // await fetch('https://notify.eskiz.uz/api/message/sms/send', { ... })
}

export async function sendAdminSms(text: string): Promise<void> {
  await sendSms(process.env.ADMIN_PHONE?.trim(), text);
}
