import {IDatabaseServices} from "./IDatabaseServices";
import {MysqlDao} from "../../DataAccess/MySql/MysqlDao";
import {ConnectionOptions} from "mysql2/promise";

export class MySqlDatabaseServices implements IDatabaseServices {
    private _databaseDao: MysqlDao;

    constructor(databaseOptions: ConnectionOptions) {
        this._databaseDao = new MysqlDao(databaseOptions);
    }
}