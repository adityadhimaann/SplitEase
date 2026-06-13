import { getGroupBalances } from './src/lib/algorithms/calculateBalances';

async function run() {
  const data = await getGroupBalances('9157a2df-da76-4b16-864d-34351f19acad');
  console.log(JSON.stringify(data.balances, null, 2));
}
run();
