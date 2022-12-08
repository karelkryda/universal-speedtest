export class HTTPUploaderData {
    private readonly length: number;
    private _data: string;
    private readonly _total: number[];

    /**
     * Constructor for HTTPUploaderData class
     * @param length - length of bytes
     */
    constructor(length: number) {
        this.length = length;
        this._data = null;
        this._total = [ 0 ];
    }

    /**
     * Creates buffer bytes from string.
     */
    public preAllocate(): void {
        const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const multiplier = Number((Math.round(Number(this.length.toFixed()) / 36.0)).toFixed());
        const repeatedChars = chars.repeat(multiplier);

        this._data = "content1=" + Buffer.from(repeatedChars.slice(0, Number(this.length.toFixed()) - 9));
    }

    /**
     * Returns data.
     */
    get data(): string {
        return this._data;
    }

    /**
     * Returns total.
     */
    get total(): number[] {
        return this._total;
    }

    /**
     * Reads chunks.
     * @param n - size
     */
    public read(n = 10240): string {
        const chunk = this.data.slice(0, n);
        this._total.push(chunk.length);
        return chunk;
    }
}
