# schiff-2 – REST & GraphQL Webservice (TypeScript, NestJS, Prisma)

# Projektbeschreibung
Dieses Projekt entstand im Rahmen des Hochschulkurses **Softwareengineering** (HKA) und dient dazu, 
eine moderne serverseitige Webanwendung mit REST- und GraphQL-Schnittstellen zu entwickeln. 
Ziel war es, praktische Erfahrung mit TypeScript, NestJS, Prisma, PostgreSQL sowie Testing-Frameworks und Monitoring-Tools zu sammeln – 
mit besonderem Fokus auf sauberer Codequalität, Testbarkeit und moderner API-Architektur.

Der Server bietet sowohl eine **REST API** als auch eine **GraphQL API**, verwendet **Prisma** als ORM und speichert Daten in einer **PostgreSQL-Datenbank**.
Schreibende Operationen werden über **Keycloak** authentifiziert. Zudem beinhaltet das Projekt **Unit-, Integrations- und Lasttests**.

# Hinweis:  
Der gesamte Quellcode im Ordner `src/schiff` sowie sämtliche Tests im Ordner `test`
und das Datenbankschema (`prisma/schema.prisma`) wurden vollständig von mir erstellt.  
Die Grundstruktur, Build-Konfigurationen und einige Setup-Dateien wurden im Kurs bereitgestellt und von mir an mehreren Stellen erweitert bzw. angepasst.


# Features
- REST API zur Bearbeitung typischer CRUD-Operationen  
- GraphQL API mit Queries und Mutations  
- PostgreSQL-Datenbank mit Prisma ORM  
- Keycloak-Integration für Authentifizierung (Required für schreibende Operationen)  
- Unit-, Integrations- und Lasttests mit Vitest  
- Docker / Docker-Compose Setup für Datenbank, Keycloak und FakeSMTP  
- Monitoring mit Grafana (optional, abhängig vom Setup)  
- Saubere und strukturierte Code-Architektur durch NestJS und EsLint  


# Technologien & Tools
- TypeScript
- NestJS (Node Framework) 
- Prisma (ORM)  
- PostgreSQL  
- Docker & Docker-Compose  
- Vitest (Unit-, Integrations-, Lasttests)  
- Keycloak  
- Grafana  
- pnpm (Package Manager)  
- EsLint (Code-Qualität)  


# Ausführung
1. Infrastruktur starten (Datenbank, Keycloak, FakeSMTP):
```bash
docker-compose up
```
2. Webserver starten
```bash
pnpm install
pnpm run dev
```
3. Tests ausführen
```bash
pnpm test
```

