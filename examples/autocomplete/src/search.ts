let cachedResult;

export async function search(query) {
  await getResult();
  return cachedResult.filter(item => item.text.includes(query)).slice(0, 5);
}

async function getResult() {
  const response = await fetch(
    'https://cors-anywhere.herokuapp.com/https://cat-fact.herokuapp.com/facts'
  );
  cachedResult = (await response.json()).all;
}
