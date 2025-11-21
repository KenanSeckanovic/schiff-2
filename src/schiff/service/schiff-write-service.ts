/**
 * Das Modul besteht aus der Klasse {@linkcode BuchWriteService} für die
 * Schreiboperationen im Anwendungskern
 * @packageDocumentation
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import { MailService } from '../../mail/mail-service.js';
import {
    VersionInvalidException,
    VersionOutdatedException,
} from './exceptions.js';
import { PrismaService } from './prisma-service.js';
import { SchiffService } from './schiff-service.js';

export type SchiffCreate = Prisma.SchiffCreateInput;
type SchiffCreated = Prisma.SchiffGetPayload<{
    include: {
        offizier: true;
        kisten: true;
    };
}>;

export type SchiffUpdate = Prisma.SchiffUpdateInput;
export type UpdateParams = {
    readonly id: number | undefined;
    readonly schiff: SchiffUpdate;
    readonly version: string;
};
type SchiffUpdated = Prisma.SchiffGetPayload<{}>;

/**
 * Die Klasse `BuchWriteService` implementiert den Anwendungskern für das
 * Schreiben von Schiffen und greift mit _Prisma_ auf die DB zu
 */
@Injectable()
export class SchiffWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #prisma: PrismaClient;

    readonly #readService: SchiffService;

    readonly #mailService: MailService;

    readonly #logger = getLogger(SchiffWriteService.name);

    // eslint-disable-next-line max-params
    constructor(
        prisma: PrismaService,
        readService: SchiffService,
        mailService: MailService,
    ) {
        this.#prisma = prisma.client;
        this.#readService = readService;
        this.#mailService = mailService;
    }

    /**
     * Ein neues Schiff soll angelegt werden
     * @param buch Das neu abzulegende Schiff
     * @returns Die ID des neu angelegten Schiffs
     */
    async create(schiff: SchiffCreate) {
        let schiffDb: SchiffCreated | undefined;
        await this.#prisma.$transaction(async (tx) => {
            schiffDb = await tx.schiff.create({
                data: schiff,
                include: { offizier: true, kisten: true },
            });
        });
        await this.#sendmail({
            id: schiffDb?.id ?? 'N/A',
            name: schiffDb?.offizier?.name ?? 'N/A',
        });

        this.#logger.debug('create: schiffDb.id=%s', schiffDb?.id ?? 'N/A');
        return schiffDb?.id ?? Number.NaN;
    }

    /**
     * Ein vorhandenes Schiff soll aktualisiert werden
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     * @throws NotFoundException falls kein Schiff zur ID vorhanden ist
     * @throws VersionInvalidException falls die Versionsnummer ungültig ist
     * @throws VersionOutdatedException falls die Versionsnummer veraltet ist
     */
    async update({ id, schiff, version }: UpdateParams) {
        this.#logger.debug(
            'update: id=%d, schiff=%o, version=%s',
            id ?? Number.NaN,
            schiff,
            version,
        );
        if (id === undefined) {
            this.#logger.debug('update: Keine gueltige ID');
            throw new NotFoundException(
                `Es gibt kein Schiff mit der ID ${id}.`,
            );
        }

        await this.#validateUpdate(id, version);

        schiff.version = { increment: 1 };
        let schiffUpdated: SchiffUpdated | undefined;
        await this.#prisma.$transaction(async (tx) => {
            schiffUpdated = await tx.schiff.update({
                data: schiff,
                where: { id },
            });
        });
        this.#logger.debug(
            'update: schiffUpdated=%s',
            JSON.stringify(schiffUpdated),
        );

        return schiffUpdated?.version ?? Number.NaN;
    }

    /**
     * Ein Schiff wird asynchron anhand seiner ID gelöscht
     *
     * @param id ID des zu löschenden Schiffs
     * @returns true, falls das Schiff vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(id: number) {
        this.#logger.debug('delete: id=%d', id);

        const schiff = await this.#prisma.schiff.findUnique({
            where: { id },
        });
        if (schiff === null) {
            this.#logger.debug('delete: not found');
            return false;
        }

        await this.#prisma.$transaction(async (tx) => {
            await tx.schiff.delete({ where: { id } });
        });

        this.#logger.debug('delete');
        return true;
    }

    async #sendmail({ id, name }: { id: number | 'N/A'; name: string }) {
        const subject = `Neues Schiff ${id}`;
        const body = `Das Schiff mit dem Titel <strong>${name}</strong> ist angelegt`;
        await this.#mailService.sendmail({ subject, body });
    }

    async #validateUpdate(id: number, versionStr: string) {
        this.#logger.debug(
            '#validateUpdate: id=%d, versionStr=%s',
            id,
            versionStr,
        );
        if (!SchiffWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidException(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        const schiffDb = await this.#readService.findById({ id });

        if (version < schiffDb.version) {
            this.#logger.debug('#validateUpdate: versionDb=%d', version);
            throw new VersionOutdatedException(version);
        }
    }
}
