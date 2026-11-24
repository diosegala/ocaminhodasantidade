// Atributos para os campos de texto do app. Sem eles, o iPhone trata a caixa como um
// campo de formulário e mostra nome e e-mail na barra do teclado, no lugar das
// sugestões que corrigem as palavras digitadas.

/** Escrita livre (lectio, reflexões, aulas, notas): corretor e maiúscula no início das frases. */
export const PROSE = {
  autoComplete: "off",
  autoCorrect: "on",
  autoCapitalize: "sentences",
  spellCheck: true,
} as const;

/** Buscas e referências bíblicas ("Jo 15,1-8"): sem preenchimento automático nem correção. */
export const NO_AUTOFILL = {
  autoComplete: "off",
  autoCorrect: "off",
  spellCheck: false,
} as const;
