import assert from 'power-assert';
import * as admin from 'firebase-admin';
import {Response} from "supertest";

const request = require('supertest');

// set stub for variables that depends on firebase functions platform
const ff_test = require('firebase-functions-test');
ff_test().mockConfig({order: {'doc_prefix': 'test: '}});
jest.spyOn(admin, 'initializeApp').mockImplementation();

// set mock for external api facade
const mockFnIssue = jest.fn();
const fnIssueSuccess = async () => {
    return "Success!!"
};
const fnIssueFailure = async () => {
    throw {name: "mock error", message: "mock error message", config: {}, code: "500", isAxiosError: false}
};

jest.mock("../src/externalApiFacade", () => {
        return jest.fn().mockImplementation(() => {
            return {
                issue: mockFnIssue
            }
        });
    }
);

const app = require("../src");

describe("/v2/order_slip", () => {
    afterEach(() => {
        mockFnIssue.mockReset();
    });

    const correctRequest = {
        document_number: 123,
        name: 'stub supply partner case',
        products: [
            {description: "Number1", unit_price: 150, lot: 100},
            {description: "Number2", unit_price: 120, lot: 250}
        ]
    };

    test("success", async () => {
        mockFnIssue.mockImplementation(fnIssueSuccess);

        const resp = await request(app.api)
            .post("/v2/order_slip")
            .set('Content-Type', 'application/json')
            .send(correctRequest);

        // assert response
        assert(resp.status === 200);
        assert(resp.body.message === 'Success!!');

        // assert invocation
        expect(mockFnIssue).toHaveBeenCalledTimes(1);
        expect(mockFnIssue).toHaveBeenCalledWith({
            document_number: 'test: 123',
            partnerName: 'stub supply partner case',
            lineItem: [
                {description: "Number1", unit_price: 150, lot: 100},
                {description: "Number2", unit_price: 120, lot: 250}
            ]
        });
    });

    describe("validation", () => {
        beforeEach(() => {
            mockFnIssue.mockImplementation(fnIssueSuccess);
        });

        it('fails with empty document name', async () => {
            await request(app.api).post("/v2/order_slip").send(
                {...correctRequest, name: ''}
            ).then((resp: Response) => {
                assert(resp.status === 422);
                assert(resp.body.length === 1);
                assert(resp.body[0].param === "name");
            });
        });

        it('fails if document_number has number under decimal point', async () => {
                await request(app.api).post("/v2/order_slip").send(
                    {...correctRequest, document_number: 123.4}
                ).then((resp: Response) => {
                    assert(resp.status === 422);
                    assert(resp.body.length === 1);
                    assert(resp.body[0].param === 'document_number');
                });
            }
        );

        it("fails one of lineitem's description is empty", async () => {
                await request(app.api).post("/v2/order_slip").send(
                    {
                        ...correctRequest, products: [
                            {description: "Number1", unit_price: 150, lot: 100},
                            {description: "", unit_price: 120, lot: 250}
                        ]
                    }
                ).then((resp: Response) => {
                    assert(resp.status === 422);
                    assert(resp.body.length === 1);
                    assert(resp.body[0].param === 'products[1].description');
                });
            }
        );

        it("fails when lot is not set or 0", async () => {
                await request(app.api).post("/v2/order_slip").send(
                    {
                        ...correctRequest, products: [
                            {description: "Number1", unit_price: 150},
                            {description: "Number2", unit_price: 120, lot: 0}
                        ]
                    }
                ).then((resp: Response) => {
                    assert(resp.status === 422);
                    assert(resp.body.length === 2);
                    assert(resp.body[0].param === 'products[0].lot');
                    assert(resp.body[1].param === 'products[1].lot');
                });
            }
        );

        it("fails when unit price is less than 0 or not set", async () => {
                await request(app.api).post("/v2/order_slip").send(
                    {
                        ...correctRequest, products: [
                            {description: "Number1", lot: 1},
                            {description: "Number2 (No Validation Error)", unit_price: 0, lot: 15},
                            {description: "Number3", unit_price: -1, lot: 20}
                        ]
                    }
                ).then((resp: Response) => {
                    assert(resp.status === 422);
                    assert(resp.body.length === 2);
                    assert(resp.body[0].param === 'products[0].unit_price');
                    assert(resp.body[1].param === 'products[2].unit_price');
                });
            }
        )
    });

    describe("external error handling", () => {
        beforeEach(() => {
            mockFnIssue.mockImplementation(fnIssueFailure);
        });

        it('works', async () => {
            const resp = await request(app.api)
                .post("/v2/order_slip")
                .set('Content-Type', 'application/json')
                .send(correctRequest);

            assert(resp.status === 500);
        });
    });
});
