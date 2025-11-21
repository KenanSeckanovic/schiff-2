/**
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

// eslint-disable-next-line max-classes-per-file
import {
    Controller,
    Get,
    Headers,
    HttpStatus,
    Param,
    ParseIntPipe,
    Query,
    Req,
    Res,
    UseInterceptors,
} from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { Public } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { Schiff } from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import { createPageable } from '../service/pageable.js';
import { SchiffService } from '../service/schiff-service.js';
import { type Suchparameter } from '../service/suchparameter.js';
import { createPage, Page } from './page.js';

/**
 * Klasse für `SchiffGetController`
 */
export class SchiffQuery implements Suchparameter {
    @ApiProperty({ required: false })
    declare readonly name?: string;

    @ApiProperty({ required: false })
    declare readonly laenge?: number;

    @ApiProperty({ required: false })
    declare size?: string;

    @ApiProperty({ required: false })
    declare page?: string;

    @ApiProperty({ required: false })
    declare only?: 'count';
}

export type CountResult = Record<'count', number>;

/**
 * Die Controller-Klasse für die Verwaltung von Schiffen
 */
@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Schiff REST-API')
export class SchiffController {
    readonly #service: SchiffService;

    readonly #logger = getLogger(SchiffController.name);

    constructor(service: SchiffService) {
        this.#service = service;
    }

    /**
     * Ein Schiff wird asynchron anhand seiner ID als Pfadparameter gesucht
     *
     * Falls es kein Schiff zur angegebenen ID gibt, wird der Statuscode `404`
     * (`Not Found`) zurückgeliefert
     *
     * @param id Pfad-Parameter `id`
     * @param req Request-Objekt von Express mit Pfadparameter, Query-String,
     *            Request-Header und Request-Body
     * @param version Versionsnummer im Request-Header bei `If-None-Match`
     * @param res Leeres Response-Objekt von Express
     * @returns Leeres Promise-Objekt
     */
    // eslint-disable-next-line max-params
    @Get(':id')
    @Public()
    async getById(
        @Param(
            'id',
            new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
        )
        id: number,
        @Req() req: Request,
        @Headers('If-None-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response<Schiff>> {
        this.#logger.debug('getById: id=%d, version=%s', id, version ?? '-1');

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('getById: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const schiff = await this.#service.findById({ id });
        this.#logger.debug('getById(): schiff=%o', schiff);

        // ETags
        const versionDb = schiff.version;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('getById: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }
        this.#logger.debug('getById: versionDb=%d', versionDb ?? -1);
        res.header('ETag', `"${versionDb}"`);

        this.#logger.debug('getById: schiff=%o', schiff);
        return res.json(schiff);
    }

    /**
     * Schiffe werden mit Query-Parametern asynchron gesucht.
     * Falls es mindestens ein solches Schiff gibt, wird der Statuscode `200` (`OK`) gesetzt
     *
     * Falls es kein Schiff zu den Suchparameter gibt, wird der Statuscode `404`
     * (`Not Found`) gesetzt
     *
     * Falls es keine Query-Parameter gibt, werden alle Schiffe ermittelt
     *
     * @param query Query-Parameter von Express.
     * @param req Request-Objekt von Express.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Get()
    @Public()
    async get(
        @Query() query: SchiffQuery,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response<Page<Readonly<Schiff>> | CountResult>> {
        this.#logger.debug('get: query=%o', query);

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('get: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const { only } = query;
        if (only !== undefined) {
            const count = await this.#service.count();
            this.#logger.debug('get: count=%d', count);
            return res.json({ count: count });
        }

        const { page, size } = query;
        delete query['page'];
        delete query['size'];
        this.#logger.debug(
            'get: page=%s, size=%s',
            page ?? 'undefined',
            size ?? 'undefined',
        );

        const keys = Object.keys(query) as (keyof SchiffQuery)[];
        keys.forEach((key) => {
            if (query[key] === undefined) {
                delete query[key];
            }
        });
        this.#logger.debug('get: query=%o', query);

        const pageable = createPageable({ number: page, size });
        const schiffeSlice = await this.#service.find(query, pageable); // NOSONAR
        const schiffPage = createPage(schiffeSlice, pageable);
        this.#logger.debug('get: schiffPage=%o', schiffPage);

        return res.json(schiffPage).send();
    }
}
