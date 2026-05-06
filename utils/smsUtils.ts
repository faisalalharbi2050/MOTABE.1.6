const GSM_BASIC_CHARS = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
);

const GSM_EXTENDED_CHARS = new Set('^{}\\[~]|€');

export const calculateSmsSegments = (message: string) => {
  const characters = Array.from(message || '');
  const isUnicode = characters.some(char => !GSM_BASIC_CHARS.has(char) && !GSM_EXTENDED_CHARS.has(char));
  const characterCount = characters.reduce((total, char) => total + (GSM_EXTENDED_CHARS.has(char) ? 2 : 1), 0);
  const maxPerMessage = isUnicode ? 70 : 160;
  const messageCount = Math.max(1, Math.ceil(characterCount / maxPerMessage));

  return {
    characterCount,
    maxPerMessage,
    messageCount,
  };
};
