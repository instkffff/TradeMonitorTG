const url = 'https://data-asg.goldprice.org/dbXRates/USD';
const options = {method: 'GET'};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  const goldPrice = data.items[0].xauPrice
  const todayTrends = data.items[0].pcXau
  const lastClose = data.items[0].xauClose
  console.log(goldPrice,todayTrends,lastClose);
} catch (error) {
  console.error(error);
}