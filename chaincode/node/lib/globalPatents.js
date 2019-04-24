/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

// predefined patent states
const patentStatus = {//rejected publishing published completed
    New: {code: 1, text: 'Patent created'},
    PendingPublish: {code: 2, text: 'Patent verified and pending publish'},
    Rejected: {code: 3, text: 'Patent verification failed'},
    Publishing: {code: 15, text: 'Patent being published'},
    Published: {code: 6, text: 'Patent published'}
};

// Global Finance contract
class GlobalPatents extends Contract {

    // instantiate with keys to collect participant ids
    async instantiate(ctx) {
        let emptyList = [];
        await ctx.stub.putState('owners', Buffer.from(JSON.stringify(emptyList))); //buyers
        await ctx.stub.putState('verifiers', Buffer.from(JSON.stringify(emptyList))); //sellers
        await ctx.stub.putState('publishers', Buffer.from(JSON.stringify(emptyList))); //shippers
        await ctx.stub.putState('auditors', Buffer.from(JSON.stringify(emptyList))); //providers
        console.info("Chaincode init success");
    }

    // add an owner object to the blockchain state identifited by the ownerId
    async registerOwner(ctx, ownerID, companyName) {
        let owner = {
            id: ownerID,
            companyName: companyName,
            type: 'owner',
            patentRequests: []
        };
        await ctx.stub.putState(ownerID, Buffer.from(JSON.stringify(owner)));

        //add ownerId to 'owners' key
        let data = await ctx.stub.getState('owners');
        if (data) {
            let owners = [];
            if (data.toString()) {
                owners = JSON.parse(data.toString());
            }
            owners.push(ownerID);
            await ctx.stub.putState('owners', Buffer.from(JSON.stringify(owners)));
        } else {
            throw new Error('owners not found');
        }
        
        // return owner object
        return JSON.stringify(owner);
    }

    // add a verifier object to the blockchain state identifited by the verifierId
    async registerVerifier(ctx, verifierID, companyName) {
        let verifier = {
            id: verifierID,
            companyName: companyName,
            type: 'verifier',
            patentRequests: []
        };
        await ctx.stub.putState(verifierID, Buffer.from(JSON.stringify(verifier)));

        // add verifierId to 'verifiers' key
        let data = await ctx.stub.getState('verifiers');
        if (data) {
            let verifiers = [];
            if (data.toString()) {
                verifiers = JSON.parse(data.toString());
            }
            verifiers.push(verifierID);
            await ctx.stub.putState('verifiers', Buffer.from(JSON.stringify(verifiers)));
        } else {
            throw new Error('verifiers not found');
        }
        
        // return verifier object
        return JSON.stringify(verifier);
    }

    // add a publisher object to the blockchain state identifited by the publisherId
    async registerPublisher(ctx, publisherID, companyName) {
        let publisher = {
            id: publisherID,
            companyName: companyName,
            type: 'publisher',
            patentRequests: []
        };
        await ctx.stub.putState(publisherID, Buffer.from(JSON.stringify(publisher)));

        // add publisherId to 'publishers' key
        let data = await ctx.stub.getState('publishers');
        if (data) {
            let publishers = [];
            if (data.toString()) {
                publishers = JSON.parse(data.toString());
            }
            publishers.push(publisherID);
            await ctx.stub.putState('publishers', Buffer.from(JSON.stringify(publishers)));
        } else {
            throw new Error('publishers not found');
        }

        // return publisher object
        return JSON.stringify(publisher);
    }

    // add a auditor object to the blockchain state identifited by the auditorId
    async registerAuditor(ctx, auditorID, companyName) {
        let auditor = {
            id: auditorID,
            companyName: companyName,
            type: 'auditor',
            patentRequests: []
        };
        await ctx.stub.putState(auditorID, Buffer.from(JSON.stringify(auditor)));

        //add auditorId to 'auditors' key
        let data = await ctx.stub.getState('auditors');
        if (data) {
            let auditors = [];
            if (data.toString()) {
                auditors = JSON.parse(data.toString());
            }
            auditors.push(auditorID);
            await ctx.stub.putState('auditors', Buffer.from(JSON.stringify(auditors)));
        } else {
            throw new Error('auditors not found');
        }
        
        // return auditor object
        return JSON.stringify(auditor);
    }

    // add a patent request object to the blockchain state
    async createPatentRequest(ctx, id, ownerIDs, verifierID, patentIndustry, priorArtifacts, details) {
        if (ownerIDs) {
            ownerIDs = JSON.parse(ownerIDs);
        }
        for (let ownerID of ownerIDs) {
            // verify ownerId
            let ownerData = await ctx.stub.getState(ownerID);
            let owner;
            if (ownerData && ownerData.toString()) {
                owner = JSON.parse(ownerData.toString());
                if (owner.type !== 'owner') {
                    throw new Error('owner not identified');
                }
                //add patent request to owner
                owner.patentRequests.push(id);
                await ctx.stub.putState(ownerID, Buffer.from(JSON.stringify(owner)));
            } else {
                throw new Error('owner not found');
            }
        }

        let patentRequest = {
            id: id,
            patentIndustry: patentIndustry,
            priorArtifacts: priorArtifacts,
            status: JSON.stringify(patentStatus.New),
            ownerIDs: ownerIDs,
            verifierID: verifierID,
            details: details
        };
        console.info("patentRequest");
        console.info(patentRequest);

        //store patent request identified by id
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(patentRequest)));

        // return patent request object
        return JSON.stringify(patentRequest);
    }

    // verifier verifies the patent request, patent request status is changed to PendingPublish, publisher ID is added to patent request.
    async verifyPatentRequest(ctx, patentID, ownerIDs, verifierID, publisherID) {
        let patentRequestData = await ctx.stub.getState(patentID);
        let patentRequest;
        if (patentRequestData) {
            patentRequest = JSON.parse(patentRequestData.toString());
        } else {
            throw new Error('patent request not found');
        }

        if (ownerIDs) {
            ownerIDs = JSON.parse(ownerIDs);
        }

        for (let ownerID of ownerIDs) {
            // verify ownerId
            let ownerData = await ctx.stub.getState(ownerID);
            let owner;
            if (ownerData && ownerData.toString()) {
                owner = JSON.parse(ownerData.toString());
                if (owner.type !== 'owner') {
                    throw new Error('owner not identified');
                }
            } else {
                throw new Error('owner not found');
            }
        }

        // verify verifierID
        let verifierData = await ctx.stub.getState(verifierID);
        let verifier;
        if (verifierData) {
            verifier = JSON.parse(verifierData.toString());
            if (verifier.type !== 'verifier') {
                throw new Error('verifier not identified');
            }
        } else {
            throw new Error('verifier not found');
        }

        // update patent request status
        if (JSON.parse(patentRequest.status).code === 1) {
            patentRequest.status = JSON.stringify(patentStatus.Verified);
            patentRequest.publisherID = publisherID;
            console.info(patentRequest);
            console.info(patentRequest.status);
            await ctx.stub.putState(patentID, Buffer.from(JSON.stringify(patentRequest)));

            if (!verifier.patents) {
                verifier.patents = [];
            }
            verifier.patents.push(patentID);
            await ctx.stub.putState(verifierID, Buffer.from(JSON.stringify(verifier)));

            return JSON.stringify(patentRequest);
        } else {
            throw new Error('patent request not created');
        }
    }


    // async OrderCancel(ctx, orderNumber, sellerId, buyerId) {

    //     // get order json
    //     let data = await ctx.stub.getState(orderNumber);
    //     let order;
    //     if (data) {
    //         order = JSON.parse(data.toString());
    //     } else {
    //         throw new Error('order not found');
    //     }

    //     // verify buyerId
    //     let buyerData = await ctx.stub.getState(buyerId);
    //     let buyer;
    //     if (buyerData) {
    //         buyer = JSON.parse(buyerData.toString());
    //         if (buyer.type !== 'buyer') {
    //             throw new Error('buyer not identified');
    //         }
    //     } else {
    //         throw new Error('buyer not found');
    //     }

    //     // verify sellerId
    //     let sellerData = await ctx.stub.getState(sellerId);
    //     let seller;
    //     if (sellerData) {
    //         seller = JSON.parse(sellerData.toString());
    //         if (seller.type !== 'seller') {
    //             throw new Error('seller not identified');
    //         }
    //     } else {
    //         throw new Error('seller not found');
    //     }

    //     //update order
    //     if (order.status == JSON.stringify(patentStatus.Created) || order.status == JSON.stringify(patentStatus.Verified) || order.status == JSON.stringify(patentStatus.Backordered)  ) {
    //         order.status = JSON.stringify(patentStatus.Cancelled);
    //         await ctx.stub.putState(orderNumber, Buffer.from(JSON.stringify(order)));
    //         return JSON.stringify(order);
    //     } else {
    //         throw new Error('order not created, bought or backordered');
    //     }
    // }


    // async OrderFromSupplier(ctx, orderNumber, sellerId, providerId) {

    //     //get order json
    //     let data = await ctx.stub.getState(orderNumber);
    //     let order;
    //     if (data) {
    //         order = JSON.parse(data.toString());
    //     } else {
    //         throw new Error('order not found');
    //     }

    //     //verify sellerId
    //     let sellerData = await ctx.stub.getState(sellerId);
    //     let seller;
    //     if (sellerData) {
    //         seller = JSON.parse(sellerData.toString());
    //         if (seller.type !== 'seller') {
    //             throw new Error('seller not identified');
    //         }
    //     } else {
    //         throw new Error('seller not found');
    //     }

    //     // verify providerId
    //     let providerData = await ctx.stub.getState(providerId);
    //     let provider;
    //     if (providerData) {
    //         provider = JSON.parse(providerData.toString());
    //         if (provider.type !== 'provider') {
    //             throw new Error('provider not identified');
    //         }
    //     } else {
    //         throw new Error('provider not found');
    //     }

    //     //update order
    //     if (order.status == JSON.stringify(patentStatus.Verified) ) {
    //         order.providerId = providerId;
    //         order.status = JSON.stringify(patentStatus.Ordered);
    //         await ctx.stub.putState(orderNumber, Buffer.from(JSON.stringify(order)));

    //         // add order to provider
    //         provider.orders.push(orderNumber);
    //         await ctx.stub.putState(providerId, Buffer.from(JSON.stringify(provider)));

    //         return JSON.stringify(order);
    //     } else {
    //         throw new Error('order status not bought');
    //     }
    // }

    // async RequestShipping(ctx, orderNumber, providerId, shipperId) {

    //     // get order json
    //     let data = await ctx.stub.getState(orderNumber);
    //     let order;
    //     if (data) {
    //         order = JSON.parse(data.toString());
    //     } else {
    //         throw new Error('order not found');
    //     }

    //     // verify providerId
    //     let providerData = await ctx.stub.getState(providerId);
    //     let provider;
    //     if (providerData) {
    //         provider = JSON.parse(providerData.toString());
    //         if (provider.type !== 'provider') {
    //             throw new Error('provider not identified');
    //         }
    //     } else {
    //         throw new Error('provider not found');
    //     }

    //     // verify shipperId
    //     let shipperData = await ctx.stub.getState(shipperId);
    //     let shipper;
    //     if (shipperData) {
    //         shipper = JSON.parse(shipperData.toString());
    //         if (shipper.type !== 'shipper') {
    //             throw new Error('shipper not identified');
    //         }
    //     } else {
    //         throw new Error('shipper not found');
    //     }

    //     // update order
    //     if (order.status == JSON.stringify(patentStatus.Ordered) || order.status == JSON.stringify(patentStatus.Backordered) ) {

    //         order.shipperId = shipperId;
    //         order.status = JSON.stringify(patentStatus.ShipRequest);
    //         await ctx.stub.putState(orderNumber, Buffer.from(JSON.stringify(order)));

    //         // add order to shipper
    //         shipper.orders.push(orderNumber);
    //         await ctx.stub.putState(shipperId, Buffer.from(JSON.stringify(shipper)));

    //         return JSON.stringify(order);

    //     } else {
    //         throw new Error('order status not ordered or backordered');
    //     }
    // }

    // async Delivering(ctx, orderNumber, shipperId, deliveryStatus) {

    //     // get order json
    //     let data = await ctx.stub.getState(orderNumber);
    //     let order;
    //     if (data) {
    //         order = JSON.parse(data.toString());
    //     } else {
    //         throw new Error('order not found');
    //     }

    //     // verify shipperId
    //     let shipperData = await ctx.stub.getState(shipperId);
    //     let shipper;
    //     if (shipperData) {
    //         shipper = JSON.parse(shipperData.toString());
    //         if (shipper.type !== 'shipper') {
    //             throw new Error('shipper not identified');
    //         }
    //     } else {
    //         throw new Error('shipper not found');
    //     }

    //     // update order
    //     if (order.status == JSON.stringify(patentStatus.ShipRequest) || order.status.code == JSON.stringify(patentStatus.Delivering.code) ) {

    //         let _status = patentStatus.Delivering;
    //         _status.text += '  '+deliveryStatus;
    //         order.status = JSON.stringify(_status);

    //         await ctx.stub.putState(orderNumber, Buffer.from(JSON.stringify(order)));
    //         return JSON.stringify(order);
    //     } else {
    //         throw new Error('order status not shipping requested or delivering');
    //     }
    // }


    // async Deliver(ctx, orderNumber, shipperId) {

    //     // get order json
    //     let data = await ctx.stub.getState(orderNumber);
    //     let order;
    //     if (data) {
    //         order = JSON.parse(data.toString());
    //     } else {
    //         throw new Error('order not found');
    //     }

    //     // verify shipperId
    //     let shipperData = await ctx.stub.getState(shipperId);
    //     let shipper;
    //     if (shipperData) {
    //         shipper = JSON.parse(shipperData.toString());
    //         if (shipper.type !== 'shipper') {
    //             throw new Error('shipper not identified');
    //         }
    //     } else {
    //         throw new Error('shipper not found');
    //     }

    //     // update order
    //     if (order.status == JSON.stringify(patentStatus.ShipRequest) || (JSON.parse(order.status).code == JSON.stringify(patentStatus.Delivering.code)) ) {

    //         order.status = JSON.stringify(patentStatus.Published);
    //         await ctx.stub.putState(orderNumber, Buffer.from(JSON.stringify(order)));
    //         return JSON.stringify(order);
    //     } else {
    //         throw new Error('order status not shipping requested or delivering');
    //     }
    // }

    // async RequestPayment(ctx, orderNumber, sellerId, financeCoId) {

    //     // get order json
    //     let data = await ctx.stub.getState(orderNumber);
    //     let order;
    //     if (data) {
    //         order = JSON.parse(data.toString());
    //     } else {
    //         throw new Error('order not found');
    //     }

    //     // verify sellerId
    //     let sellerData = await ctx.stub.getState(sellerId);
    //     let seller;
    //     if (sellerData) {
    //         seller = JSON.parse(sellerData.toString());
    //         if (seller.type !== 'seller') {
    //             throw new Error('seller not identified');
    //         }
    //     } else {
    //         throw new Error('seller not found');
    //     }

    //     // verify financeCoId
    //     let financeCoData = await ctx.stub.getState(financeCoId);
    //     let financeCo;
    //     if (financeCoData) {
    //         financeCo = JSON.parse(financeCoData.toString());
    //         if (financeCo.type !== 'financeCo') {
    //             throw new Error('financeCo not identified');
    //         }
    //     } else {
    //         throw new Error('financeCo not found');
    //     }

    //     // update order
    //     if ((JSON.parse(order.status).text == patentStatus.Published.text) || (JSON.parse(order.status).text == patentStatus.Resolve.text)) {

    //         order.status = JSON.stringify(patentStatus.PayRequest);

    //         await ctx.stub.putState(orderNumber, Buffer.from(JSON.stringify(order)));
    //         return JSON.stringify(order);
    //     } else {
    //         throw new Error('order status not delivered or resolved');
    //     }
    // }


    // async AuthorizePayment(ctx, orderNumber, buyerId, financeCoId) {

    //     // get order json
    //     let data = await ctx.stub.getState(orderNumber);
    //     let order;
    //     if (data) {
    //         order = JSON.parse(data.toString());
    //     } else {
    //         throw new Error('order not found');
    //     }

    //     // verify buyerId
    //     let buyerData = await ctx.stub.getState(buyerId);
    //     let buyer;
    //     if (buyerData) {
    //         buyer = JSON.parse(buyerData.toString());
    //         if (buyer.type !== 'buyer') {
    //             throw new Error('buyer not identified');
    //         }
    //     } else {
    //         throw new Error('buyer not found');
    //     }

    //     // verify financeCoId
    //     let financeCoData = await ctx.stub.getState(financeCoId);
    //     let financeCo;
    //     if (financeCoData) {
    //         financeCo = JSON.parse(financeCoData.toString());
    //         if (financeCo.type !== 'financeCo') {
    //             throw new Error('financeCo not identified');
    //         }
    //     } else {
    //         throw new Error('financeCo not found');
    //     }

    //     //update order
    //     if ((JSON.parse(order.status).text == patentStatus.PayRequest.text ) || (JSON.parse(order.status).text == patentStatus.Resolve.text )) {

    //         order.status = JSON.stringify(patentStatus.Authorize);

    //         await ctx.stub.putState(orderNumber, Buffer.from(JSON.stringify(order)));
    //         return JSON.stringify(order);
    //     } else {
    //         throw new Error('order status not payment requested or resolved');
    //     }
    // }

    // async Pay(ctx, orderNumber, sellerId, financeCoId) {

    //     // get order json
    //     let data = await ctx.stub.getState(orderNumber);
    //     let order;
    //     if (data) {
    //         order = JSON.parse(data.toString());
    //     } else {
    //         throw new Error('order not found');
    //     }

    //     // verify sellerId
    //     let sellerData = await ctx.stub.getState(sellerId);
    //     let seller;
    //     if (sellerData) {
    //         seller = JSON.parse(sellerData.toString());
    //         if (seller.type !== 'seller') {
    //             throw new Error('seller not identified');
    //         }
    //     } else {
    //         throw new Error('seller not found');
    //     }

    //     // verify financeCoId
    //     let financeCoData = await ctx.stub.getState(financeCoId);
    //     let financeCo;
    //     if (financeCoData) {
    //         financeCo = JSON.parse(financeCoData.toString());
    //         if (financeCo.type !== 'financeCo') {
    //             throw new Error('financeCo not identified');
    //         }
    //     } else {
    //         throw new Error('financeCo not found');
    //     }

    //     // update order
    //     if (JSON.parse(order.status).text == patentStatus.Authorize.text ) {

    //         order.status = JSON.stringify(patentStatus.Paid);

    //         await ctx.stub.putState(orderNumber, Buffer.from(JSON.stringify(order)));
    //         return JSON.stringify(order);
    //     } else {
    //         throw new Error('order status not authorize payment');
    //     }
    // }

    // async Dispute(ctx, orderNumber, buyerId, sellerId, financeCoId, dispute) {

    //     // get order json
    //     let data = await ctx.stub.getState(orderNumber);
    //     let order;
    //     if (data) {
    //         order = JSON.parse(data.toString());
    //     } else {
    //         throw new Error('order not found');
    //     }

    //     // verify sellerId
    //     let sellerData = await ctx.stub.getState(sellerId);
    //     let seller;
    //     if (sellerData) {
    //         seller = JSON.parse(sellerData.toString());
    //         if (seller.type !== 'seller') {
    //             throw new Error('seller not identified');
    //         }
    //     } else {
    //         throw new Error('seller not found');
    //     }

    //     // verify financeCoId
    //     let financeCoData = await ctx.stub.getState(financeCoId);
    //     let financeCo;
    //     if (financeCoData) {
    //         financeCo = JSON.parse(financeCoData.toString());
    //         if (financeCo.type !== 'financeCo') {
    //             throw new Error('financeCo not identified');
    //         }
    //     } else {
    //         throw new Error('financeCo not found');
    //     }

    //     // verify buyerId
    //     let buyerData = await ctx.stub.getState(buyerId);
    //     let buyer;
    //     if (buyerData) {
    //         buyer = JSON.parse(buyerData.toString());
    //         if (buyer.type !== 'buyer') {
    //             throw new Error('buyer not identified');
    //         }
    //     } else {
    //         throw new Error('buyer not found');
    //     }

    //     //update order
    //     order.status = JSON.stringify(patentStatus.Dispute);
    //     order.dispute = dispute;
    //     await ctx.stub.putState(orderNumber, Buffer.from(JSON.stringify(order)));
    //     return JSON.stringify(order);

    // }

    // async Resolve(ctx, orderNumber, buyerId, sellerId, shipperId, providerId, financeCoId, resolve) {

    //     // get order json
    //     let data = await ctx.stub.getState(orderNumber);
    //     let order;
    //     if (data) {
    //         order = JSON.parse(data.toString());
    //     } else {
    //         throw new Error('order not found');
    //     }

    //     // verify buyerId
    //     let buyerData = await ctx.stub.getState(buyerId);
    //     let buyer;
    //     if (buyerData) {
    //         buyer = JSON.parse(buyerData.toString());
    //         if (buyer.type !== 'buyer') {
    //             throw new Error('buyer not identified');
    //         }
    //     } else {
    //         throw new Error('buyer not found');
    //     }

    //     // verify sellerId
    //     let sellerData = await ctx.stub.getState(sellerId);
    //     let seller;
    //     if (sellerData) {
    //         seller = JSON.parse(sellerData.toString());
    //         if (seller.type !== 'seller') {
    //             throw new Error('seller not identified');
    //         }
    //     } else {
    //         throw new Error('seller not found');
    //     }

    //     // verify shipperId
    //     let shipperData = await ctx.stub.getState(shipperId);
    //     let shipper;
    //     if (shipperData) {
    //         shipper = JSON.parse(shipperData.toString());
    //         if (shipper.type !== 'shipper') {
    //             throw new Error('shipper not identified');
    //         }
    //     } else {
    //         throw new Error('shipper not found');
    //     }

    //     // verify providerId
    //     let providerData = await ctx.stub.getState(providerId);
    //     let provider;
    //     if (providerData) {
    //         provider = JSON.parse(providerData.toString());
    //         if (provider.type !== 'provider') {
    //             throw new Error('provider not identified');
    //         }
    //     } else {
    //         throw new Error('provider not found');
    //     }

    //     // verify financeCoId
    //     let financeCoData = await ctx.stub.getState(financeCoId);
    //     let financeCo;
    //     if (financeCoData) {
    //         financeCo = JSON.parse(financeCoData.toString());
    //         if (financeCo.type !== 'financeCo') {
    //             throw new Error('financeCo not identified');
    //         }
    //     } else {
    //         throw new Error('financeCo not found');
    //     }

    //     // update order
    //     order.status = JSON.stringify(patentStatus.Resolve);
    //     order.resolve = resolve;
    //     await ctx.stub.putState(orderNumber, Buffer.from(JSON.stringify(order)));
    //     return JSON.stringify(order);

    // }


    // async Refund(ctx, orderNumber, sellerId, financeCoId, refund) {

    //     // get order json
    //     let data = await ctx.stub.getState(orderNumber);
    //     let order;
    //     if (data) {
    //         order = JSON.parse(data.toString());
    //     } else {
    //         throw new Error('order not found');
    //     }

    //     // verify sellerId
    //     let sellerData = await ctx.stub.getState(sellerId);
    //     let seller;
    //     if (sellerData) {
    //         seller = JSON.parse(sellerData.toString());
    //         if (seller.type !== 'seller') {
    //             throw new Error('seller not identified');
    //         }
    //     } else {
    //         throw new Error('seller not found');
    //     }

    //     // verify financeCoId
    //     let financeCoData = await ctx.stub.getState(financeCoId);
    //     let financeCo;
    //     if (financeCoData) {
    //         financeCo = JSON.parse(financeCoData.toString());
    //         if (financeCo.type !== 'financeCo') {
    //             throw new Error('financeCo not identified');
    //         }
    //     } else {
    //         throw new Error('financeCo not found');
    //     }

    //     order.status = JSON.stringify(patentStatus.Refund);
    //     order.refund = refund;

    //     await ctx.stub.putState(orderNumber, Buffer.from(JSON.stringify(order)));
    //     return JSON.stringify(order);
    // }


    // async BackOrder(ctx, orderNumber, providerId, backorder) {

    //     // get order json
    //     let data = await ctx.stub.getState(orderNumber);
    //     let order;
    //     if (data) {
    //         order = JSON.parse(data.toString());
    //     } else {
    //         throw new Error('order not found');
    //     }

    //     // verify providerId
    //     let providerData = await ctx.stub.getState(providerId);
    //     let provider = JSON.parse(providerData.toString());
    //     if (provider.type !== 'provider' || order.providerId !== providerId) {
    //         throw new Error('provider not identified');
    //     }

    //     // update order
    //     order.status = JSON.stringify(patentStatus.Backordered);
    //     order.backOrder = backorder;
    //     await ctx.stub.putState(orderNumber, Buffer.from(JSON.stringify(order)));
    //     return JSON.stringify(order);
    // }

    // get the state from key
    async GetState(ctx, key) {
        let data = await ctx.stub.getState(key);
        let jsonData = "";
        if (data.toString()) {
            jsonData = JSON.parse(data.toString());
        }
        return JSON.stringify(jsonData);
    }

}

module.exports = GlobalPatents;