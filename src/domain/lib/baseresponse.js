class BaseResponse {
    constructor(
      
       rs,
       res,
       rc,
       msgkey,
       error

    ) {

    }
  
     success(rs, res, rc, msgkey="F9E8B71A-DBCD-460F-912B-935089AD4BB90") {
      return new BaseResponse(rs, res, rc,msgkey, null)
    }
  
     failed(rs,msgkey="F9E8B71A-DBCD-460F-912B-935089AD4BB90",error="") {
      return new BaseResponse(rs, null, null,msgkey,error)
    }
  }

  module.exports = { BaseResponse }