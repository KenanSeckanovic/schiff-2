import { Module } from '@nestjs/common';
import { MailModule } from '../mail/module.js';
import { KeycloakModule } from '../security/keycloak/module.js';
import { SchiffController } from './controller/schiff-controller.js';
import { SchiffWriteController } from './controller/schiff-write-controller.js';
import { SchiffMutationResolver } from './resolver/mutation.js';
import { SchiffQueryResolver } from './resolver/query.js';
import { PrismaService } from './service/prisma-service.js';
import { SchiffService } from './service/schiff-service.js';
import { SchiffWriteService } from './service/schiff-write-service.js';
import { WhereBuilder } from './service/where-builder.js';

/**
 * Das Modul besteht aus Controller- und Service-Klassen für die Verwaltung von
 * Schiffen
 * @packageDocumentation
 */

/**
 * Die dekorierte Modul-Klasse mit Controller- und Service-Klassen sowie der
 * Funktionalität für Prisma
 */
@Module({
    imports: [KeycloakModule, MailModule],
    controllers: [SchiffController, SchiffWriteController],
    // Provider sind z.B. Service-Klassen fuer DI
    providers: [
        SchiffService,
        SchiffWriteService,
        SchiffQueryResolver,
        SchiffMutationResolver,
        PrismaService,
        WhereBuilder,
    ],
    // Export der Provider fuer DI in anderen Modulen
    exports: [SchiffService, SchiffWriteService],
})
export class SchiffModule {}
