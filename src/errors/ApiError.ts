//Use ApiError when:
//“The request is correct, but the action is not allowed or valid in business logic”
//Do NOT use ApiError when:
//“Something in the code is broken or unexpected”

export class ApiError extends Error{
    code: string;
    status: number;

    constructor(code: string, message: string, status: number){
        super(message)

        this.code = code
        this.status = status

        Object.setPrototypeOf(this,ApiError.prototype)
    }
    override name = "ApiError"
}