export default class ExternalApiFacade {
    constructor() {
    }

    async issue(invoice: OrderSlip): Promise<string> {
        // In practice we call external service's REST API with axios
        return Promise.resolve("Success!!");
    }
}

interface OrderSlip {
    document_number: string;
    partnerName: string;
    lineItem: LineItem[];
}

interface LineItem {
    description: string;
    unit_price: number;
    lot: number;
}
