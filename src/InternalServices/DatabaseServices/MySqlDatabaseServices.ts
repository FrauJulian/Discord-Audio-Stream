import {IDatabaseServices} from "./IDatabaseServices";

export class MySqlDatabaseServices implements IDatabaseServices {

    constructor(databaseOptions: {
        Host: string;
        Port: number;
        Username: string;
        Password: string;
        Database: string;
    }) {
        //IMPLEMENT DATABASE
    }
}