const cache: { [key: string]: number } = {};

export const normalizeCost = async (amount: number | string, from: string, to: string, date: string = 'latest'): Promise<number> => {
  const numericAmount = Number(amount) || 0;
  if (from === to) return numericAmount;

  const cacheKey = `${date}-${from}-${to}`;
  if (cache[cacheKey]) return numericAmount * cache[cacheKey];

  try {
    const response = await fetch(`https://api.frankfurter.app/${date}?from=${from}&to=${to}`);
    if (!response.ok) {
      const fallbackResponse = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
      if (!fallbackResponse.ok) return numericAmount;
      const data = await fallbackResponse.json();
      const rate = data.rates[to];
      if (!rate) return numericAmount;
      cache[`latest-${from}-${to}`] = rate;
      return numericAmount * rate;
    }
    const data = await response.json();
    const rate = data.rates[to];
    if (!rate) return numericAmount;
    cache[cacheKey] = rate;
    return numericAmount * rate;
  } catch {
    return numericAmount;
  }
};
