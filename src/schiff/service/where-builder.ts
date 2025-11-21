/**
 * Das Modul besteht aus der Klasse {@linkcode WhereBuilder}
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { type SchiffWhereInput } from '../../generated/prisma/models/Schiff.js';
import { getLogger } from '../../logger/logger.js';
import { type Suchparameter } from './suchparameter.js';

/** Typdefinitionen für die Suche mit der Schiff-ID */
export type BuildIdParams = {
    /** ID des gesuchten Schiffs */
    readonly id: number;
};

/**
 * Die Klasse `WhereBuilder` baut die WHERE-Klausel für DB-Anfragen mit _Prisma_
 */
@Injectable()
export class WhereBuilder {
    readonly #logger = getLogger(WhereBuilder.name);

    /**
     * WHERE-Klausel für die flexible Suche nach Schiffen bauen
     * @param suchparameter JSON-Objekt mit Suchparameter
     * @returns BuchWhereInput
     */
    // eslint-disable-next-line max-lines-per-function, prettier/prettier, sonarjs/cognitive-complexity
    build({ ...restProps }: Suchparameter) {
        this.#logger.debug('build: restProps=%o', restProps);

        let where: SchiffWhereInput = {};

        Object.entries(restProps).forEach(([key, value]) => {
            switch (key) {
                case 'name':
                    where.name = {
                        contains: value as string,
                        mode: Prisma.QueryMode.insensitive,
                    };
                    break;
                case 'laenge': {
                    const laengeNumber = Number.parseInt(value as string);
                    if (!Number.isNaN(laengeNumber)) {
                        where.laenge = { gte: laengeNumber };
                    }
                    break;
                }
            }
        });

        this.#logger.debug('build: where=%o', where);
        return where;
    }
}
