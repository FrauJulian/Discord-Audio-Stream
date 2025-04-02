import {IMySqlDao} from "./IMySqlDao";
import mysql, {Connection, ConnectionOptions} from 'mysql2/promise';
import {Connection as BaseConnection} from "mysql2/typings/mysql/lib/Connection";

export class MysqlDao implements IMySqlDao {
    private _mysqlDatabaseContext!: Connection;

    constructor(mysqlAuthenticationData: ConnectionOptions) {
        this.InitializeDatabaseContext(mysqlAuthenticationData).catch(error => {
            throw new Error(error)
        });
    }

    private async InitializeDatabaseContext(mysqlAuthenticationData: ConnectionOptions): Promise<void> {
        this._mysqlDatabaseContext = await mysql.createConnection(mysqlAuthenticationData);
    }
}
