export type ReviewInput = { rating: number; body: string };

export function validateReview(input: Record<string, unknown>): ReviewInput {
  const rating = input.rating;
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (!Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5) throw new Error("Выберите оценку от 1 до 5 звёзд.");
  const length = Array.from(body).length;
  if (length < 10 || length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body)) throw new Error("Отзыв должен содержать от 10 до 2000 символов без управляющих знаков.");
  return { rating: rating as number, body };
}
