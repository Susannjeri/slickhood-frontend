declare module "currency-codes/data" {
  const data: {
    code: string;
    number: string;
    digits: number;
    currency: string;
    countries: string[];
  }[];
  export default data;
}
