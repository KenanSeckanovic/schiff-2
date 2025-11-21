/**
 * Das Modul besteht aus der Controller-Klasse für Schreiben an der REST-Schnittstelle
 * @packageDocumentation
 */

import {
    Body,
    Controller,
    Delete,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import {
    SchiffCreate,
    SchiffUpdate,
    SchiffWriteService,
} from '../service/schiff-write-service.js';
import { createBaseUri } from './create-base-uri.js';
import { SchiffDTO } from './schiff-dto.js';

/**
 * Die Controller-Klasse für die Verwaltung von Schiffen
 */
@Controller(paths.rest)
@UseGuards(AuthGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Buch REST-API')
@ApiBearerAuth()
export class SchiffWriteController {
    readonly #service: SchiffWriteService;

    readonly #logger = getLogger(SchiffWriteController.name);

    constructor(service: SchiffWriteService) {
        this.#service = service;
    }

    /**
     * Ein neues Schiff wird asynchron angelegt
     *
     * @param schiffDTO JSON-Daten für ein Schiff im Request-Body
     * @param req Request-Objekt von Express für den Location-Header
     * @param res Leeres Response-Objekt von Express
     * @returns Leeres Promise-Objekt
     */
    @Post()
    @Roles('admin', 'user')
    async post(
        @Body() schiffDTO: SchiffDTO,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('post: schiffDTO=%o', schiffDTO);

        const schiff = this.#schiffDtoToSchiffCreateInput(schiffDTO);
        const id = await this.#service.create(schiff);

        const location = `${createBaseUri(req)}/${id}`;
        this.#logger.debug('post: location=%s', location);
        return res.location(location).send();
    }

    /**
     * Ein vorhandenes Schiff wird asynchron aktualisiert
     *
     * @param schiffDTO Schiffdaten im Body des Request-Objekts
     * @param id Pfad-Paramater für die ID
     * @param version Versionsnummer aus dem Header _If-Match_
     * @param res Leeres Response-Objekt von Express
     * @returns Leeres Promise-Objekt
     */
    // eslint-disable-next-line max-params
    @Put(':id')
    @Roles('admin', 'user')
    @HttpCode(HttpStatus.NO_CONTENT)
    async put(
        @Body() schiffDTO: SchiffDTO,
        @Param(
            'id',
            new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
        )
        id: number,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug(
            'put: id=%d, schiffDTO=%o, version=%s',
            id,
            schiffDTO,
            version ?? 'undefined',
        );

        if (version === undefined) {
            const msg = 'Header "If-Match" fehlt';
            this.#logger.debug('put: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'application/json')
                .send(msg);
        }

        const schiff = this.#schiffDtoToSchiffUpdate(schiffDTO);
        const neueVersion = await this.#service.update({ id, schiff, version });
        this.#logger.debug('put: version=%d', neueVersion);
        return res.header('ETag', `"${neueVersion}"`).send();
    }

    /**
     * Ein Schiff wird anhand seiner ID-gelöscht, die als Pfad-Parameter angegeben ist
     *
     * @param id Pfad-Paramater für die ID
     * @returns Leeres Promise-Objekt
     */
    @Delete(':id')
    @Roles('admin')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id') id: number) {
        this.#logger.debug('delete: id=%d', id);
        await this.#service.delete(id);
    }

    #schiffDtoToSchiffCreateInput(schiffDTO: SchiffDTO): SchiffCreate {
        const kisten = schiffDTO.kisten?.map((kisteDTO) => {
            const kiste = {
                hoehe: kisteDTO.hoehe,
                laenge: kisteDTO.laenge,
                breite: kisteDTO.breite,
            };
            return kiste;
        });
        const schiff: SchiffCreate = {
            version: 0,
            name: schiffDTO.name,
            laenge: schiffDTO.laenge,
            offizier: {
                create: {
                    name: schiffDTO.offizier.name,
                    alter: schiffDTO.offizier.alter as number,
                },
            },
            kisten: { create: kisten ?? [] },
        };
        return schiff;
    }

    #schiffDtoToSchiffUpdate(schiffDTO: SchiffDTO): SchiffUpdate {
        return {
            version: 0,
            name: schiffDTO.name,
            laenge: schiffDTO.laenge,
        };
    }
}
/* eslint-enable max-lines */
