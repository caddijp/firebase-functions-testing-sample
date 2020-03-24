import * as functions from 'firebase-functions';
import express from 'express';
import * as admin from 'firebase-admin';
import * as handlers from './issueOrderSlip';

if (!admin.apps.length) {
    admin.initializeApp();
}

const app = express();

// Originally you don't need following middleware because Firebase Functions usually
// parse request body if request has header `Content-Type: application/json`.
// But this automatic parsing doesn't run when request is sent in jest unit testing,
// so we add these middleware explicitly.
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.post('/v2/order_slip', handlers.createDocumentValidator, handlers.issueOrderSlipV2Handler);

exports.api = functions.region('asia-northeast1').https.onRequest(app);
