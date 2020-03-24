import * as express from 'express';
import ExternalApiFacade from './externalApiFacade'
import {check, validationResult} from 'express-validator';
import * as functions from 'firebase-functions';

export const createDocumentValidator = [
    check('document_number').notEmpty().isInt({gt: 0}).withMessage("Must be positive int"),
    check('name').notEmpty().withMessage("Should not be empty"),
    check('products.*.description').notEmpty().withMessage("should not be empty"),
    check('products.*.unit_price').isInt({min: 0}).withMessage("should be >= 0"),
    check('products.*.lot').isInt({gt: 0}).withMessage("should be > 0")
];

export const issueOrderSlipV2Handler = async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json(errors.array());
    }
    const reqDto = req.body as IssueOrderSlipV2Request;

    // Actually we have more various data mapping like this.
    const documentNumber = `${functions.config().order.doc_prefix}${reqDto.document_number}`;

    const orderSlipRequest = {
        document_number: documentNumber,
        partnerName: reqDto.name,
        lineItem: reqDto.products.map(product => {
            return {
                description: product.description,
                unit_price: product.unit_price,
                lot: product.lot
            }
        })
    };

    try {
        const result = await new ExternalApiFacade().issue(orderSlipRequest);
        if (result == "Success!!") {
            return res.status(200).json({message: "Success!!"});
        } else {
            return res.status(500).json({message: "External API did not return success", detail: result});
        }
    } catch (e) {
        return res.status(500).json({message: "Something Went Wrong!!", detail: e});
    }
};

interface IssueOrderSlipV2Request {
    document_number: number
    name: string
    products: Product[]
}

interface Product {
    description: string
    unit_price: number
    lot: number
}
