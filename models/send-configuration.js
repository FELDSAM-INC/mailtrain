'use strict';

const knex = require('../lib/knex');
const hasher = require('node-object-hash')();
const dtHelpers = require('../lib/dt-helpers');
const { enforce, filterObject } = require('../lib/helpers');
const interoperableErrors = require('../shared/interoperable-errors');
const shares = require('./shares');
const namespaceHelpers = require('../lib/namespace-helpers');
const {MailerType} = require('../shared/send-configurations');

const allowedKeys = new Set(['name', 'description', 'from_email', 'from_email_overridable', 'from_name', 'from_name_overridable', 'subject', 'subject_overridable', 'mailer_type', 'mailer_settings', 'namespace']);


function hash(entity) {
    return hasher.hash(filterObject(entity, allowedKeys));
}


async function listDTAjax(context, params) {
    return await dtHelpers.ajaxListWithPermissions(
        context,
        [{ entityTypeId: 'sendConfiguration', requiredOperations: ['view'] }],
        params,
        builder => builder
            .from('send_configurations')
            .innerJoin('namespaces', 'namespaces.id', 'send_configurations.namespace'),
        ['send_configurations.id', 'send_configurations.name', 'send_configurations.description', 'send_configurations.mailer_type', 'send_configurations.created', 'namespaces.name']
    );
}

async function getById(context, id, withPermissions = true) {
    return await knex.transaction(async tx => {
        await shares.enforceEntityPermissionTx(tx, context, 'sendConfiguration', id, 'view');
        const entity = await tx('send_configurations').where('id', id).first();
        entity.mailer_settings = JSON.parse(entity.mailer_settings);

        // note that permissions are optional as as this methods may be used with synthetic admin context
        if (withPermissions) {
            entity.permissions = await shares.getPermissionsTx(tx, context, 'sendConfiguration', id);
        }

        return entity;
    });
}

async function _validateAndPreprocess(tx, entity, isCreate) {
    await namespaceHelpers.validateEntity(tx, entity);

    enforce(entity.mailer_type >= 0 && entity.mailer_type < MailerType.MAX, 'Unknown mailer type');
    entity.mailer_settings = JSON.stringify(entity.mailer_settings);
}



async function create(context, entity) {
    return await knex.transaction(async tx => {
        await shares.enforceEntityPermissionTx(tx, context, 'namespace', entity.namespace, 'createSendConfiguration');

        await _validateAndPreprocess(tx, entity);

        const ids = await tx('send_configurations').insert(filterObject(entity, allowedKeys));
        const id = ids[0];

        await shares.rebuildPermissionsTx(tx, { entityTypeId: 'sendConfiguration', entityId: id });

        return id;
    });
}

async function updateWithConsistencyCheck(context, entity) {
    await knex.transaction(async tx => {
        await shares.enforceEntityPermissionTx(tx, context, 'list', entity.id, 'edit');

        const existing = await tx('send_configurations').where('id', entity.id).first();
        if (!existing) {
            throw new interoperableErrors.NotFoundError();
        }

        existing.mailer_settings = JSON.parse(existing.mailer_settings);

        const existingHash = hash(existing);
        if (existingHash !== entity.originalHash) {
            throw new interoperableErrors.ChangedError();
        }

        await _validateAndPreprocess(tx, entity);

        await namespaceHelpers.validateMove(context, entity, existing, 'sendConfiguration', 'createSendConfiguration', 'delete');

        await tx('send_configurations').where('id', entity.id).update(filterObject(entity, allowedKeys));

        await shares.rebuildPermissionsTx(tx, { entityTypeId: 'sendConfiguration', entityId: entity.id });
    });
}

async function remove(context, id) {
    await knex.transaction(async tx => {
        await shares.enforceEntityPermissionTx(tx, context, 'sendConfiguration', id, 'delete');

        await tx('send_configurations').where('id', id).del();
    });
}


module.exports = {
    MailerType,
    hash,
    listDTAjax,
    getById,
    create,
    updateWithConsistencyCheck,
    remove
};