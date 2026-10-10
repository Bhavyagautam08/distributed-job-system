export async function calculatePrimes(payload) {
    const limit = Number(payload.limit);

    if (!Number.isInteger(limit) || limit < 2) {
        throw new Error(
            "calculate_primes requires an integer limit >= 2"
        );
    }

    const primes = [];

    for (let number = 2; number <= limit; number++) {
        let isPrime = true;

        for (
            let divisor = 2;
            divisor * divisor <= number;
            divisor++
        ) {
            if (number % divisor === 0) {
                isPrime = false;
                break;
            }
        }

        if (isPrime) {
            primes.push(number);
        }
    }

    return {
        limit,
        count: primes.length,
        primes
    };
}