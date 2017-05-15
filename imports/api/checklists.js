/* eslint-disable no-global-assign, no-undef, import/extensions */

import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import ObjectId from 'bson-objectid';
import {ValidatedMethod} from 'meteor/mdg:validated-method';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
// import {DDPRateLimiter} from 'meteor/ddp-rate-limiter';

export const Checklists = new Mongo.Collection('checklists');

Checklists.deny({
    insert() {
        return true;
    },
    update() {
        return true;
    },
    remove() {
        return true;
    }
});

export const insertChecklist = new ValidatedMethod({
    name: 'checklists.insert',
    validate: new SimpleSchema({
        checklist: {
            type: Object
        },
        'checklist.name': {
            type: String
        },
        'checklist.description': {
            type: String,
            optional: true
        },
        'checklist.items': {
            type: Array,
            blackbox: true
        },
        'checklist.owner': {
            type: String
        },
        'checklist.createdAt': {
            type: Date
        },
        'checklist.completeBefore': {
            type: Date,
            optional: true
        },
        'checklist.sharedwith': {
            type: Object,
            blackbox: true
        }
    }).validator(),
    run({checklist}) {
        Checklists.insert(checklist);
    }
});

export const deleteChecklist = new new ValidatedMethod({
    name: 'checklists.deleteChecklist',
    validate: new SimpleSchema({
        checklistId: {
            type: String
        }
    }).validator(),
    run({checklistId}) {
        const checklist = Checklists.find(item.checklistId).fetch()[0];
        if(checklist.owner !== Meteor.user().services.facebook.username)
        {
            throw new Meteor.Error('checklists.deleteChecklist', 'Cannot delete this checklist because you are not its owner');
        }
        Checklists.remove(checklistId);
    }
});

export const insertItem = new ValidatedMethod({
    name: 'checklists.addItem',
    validate: new SimpleSchema({
        item: {
            type: Object
        },
        'item.checklistId': {
            type: String
        },
        'item.name': {
            type: String
        },
        'item.quantity': {
            type: Number,
            optional: true
        },
        'item.assignedTo': {
            type: Array,
            optional: true
        },
        'item.createdAt': {
            type: Date
        },
        'item.completeBefore': {
            type: Date,
            optional: true
        },
        'item.assignedTo.$': {
            type: Object
        },
        'item.priority': {
            type: Number
        },
        'item.done': {
            type: Boolean
        }
    }).validator(),
    run({item}) {
        const checklist = Checklists.find(item.checklistId).fetch()[0];
        let userFound = false;
        let writePerm = false;
        for(user in checklist.sharedwith) {
            if(user.username === Meteor.user().services.facebook.username) {
                userFound = true;
                readPerm = user.writePerm;
                break;
            }
        }
        if(!userFound || userFound && !writePerm) {
            throw new Meteor.Error('checklists.insertItem', 'Cannot add a new item because you are not authorized to do it');
        }

        Checklists.update(item.checklistId, {
            $push: {
                items: {
                    '_id': ObjectId(),
                    'name': item.name,
                    'quantity': item.quantity,
                    'addedBy': Meteor.user().services.facebook.username,
                    'assignedTo': item.assignedTo,
                    'createdAt': item.createdAt,
                    'completeBefore': item.completeBefore,
                    'priority': item.priority,
                    'done': item.done
                }
            }
        });

        return Checklists.find(item.checklistId).fetch()[0].items;
    }
});

export const deleteItem = new ValidatedMethod({
    name: 'checklists.deleteItem',
    validate: new SimpleSchema({
        checklistId: {
            type: String
        },
        itemId: {
            type: ObjectId(),
            blackbox: true
        }
    }).validator(),
    run({checklistId, itemId}) {
        const checklist = Checklists.find(checklistId).fetch()[0];
        let userFound = false;
        let writePerm = false;
        for(user in checklist.sharedwith) {
            if(user.username === Meteor.user().services.facebook.username) {
                userFound = true;
                readPerm = user.writePerm;
                break;
            }
        }

        if(!userFound || userFound && !writePerm) {
            throw new Meteor.Error('checklists.deleteItem', 'Cannot delete an item because you are not authorized to do it');
        }

        Checklists.update(checklistId, {
            $pull: {
                items: {
                    '_id': itemId
                }
            }
        });

        return Checklists.find(checklistId).fetch()[0].items;
    }
});
