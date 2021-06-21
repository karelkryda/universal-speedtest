import { FastAPI } from '../index';
describe('Puppeteer tests', () => {
    test('Run speed test', async (done) => {
        const FastTest = new FastAPI({
            measureUpload: true,
            timeout: 60000
        });

        const result = await FastTest.runTest();
        expect(result.pingUnit).toBe("ms");
        done();
    }, 60000);
});