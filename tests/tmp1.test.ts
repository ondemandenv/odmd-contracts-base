import {OdmdEnverCtnImg} from "../lib/odmd-model/odmd-enver-ctn-img";
import {App, Stack} from "aws-cdk-lib";
import {Repository, RepositoryProps} from "aws-cdk-lib/aws-ecr";
import {TmpTstContracts, TmpTstContracts1} from "./tmp-tst-contracts";


test('make_sense1', () => {

    process.env.CDK_DEFAULT_ACCOUNT = 'aaaaaa'
    process.env.CDK_DEFAULT_REGION = 'us-west-1'
    const app = new App()
    const theContracts = new TmpTstContracts(app)

    const buildRegion = process.env.CDK_DEFAULT_REGION;
    const buildAccount = process.env.CDK_DEFAULT_ACCOUNT
        ? process.env.CDK_DEFAULT_ACCOUNT
        : process.env.CODEBUILD_BUILD_ARN!.split(":")[4];

    const stack = new Stack(app, 'abc123', {
        env: {
            account: buildAccount,
            region: buildRegion
        }
    });

    theContracts.odmdBuilds.forEach(cc => {
        cc.envers.forEach(enver => {
            if (enver instanceof OdmdEnverCtnImg) {

                let cimgEnvr = enver as OdmdEnverCtnImg;
                const imgToRepo: {
                    [p: string]: RepositoryProps
                } = cimgEnvr.builtImgNameToRepo
                const imgToProdcr = cimgEnvr.builtImgNameToRepoProducer
                for (const imgName in imgToRepo) {
                    try {
                        new Repository(stack, imgName, imgToRepo[imgName]);

                    } catch (e) {
                        throw e
                    }
                    if (!imgToProdcr[imgName]) {
                        console.warn()
                    }
                }
            }
        })
    })

    try {
        theContracts.odmdValidate()
    } catch (e) {
        if ((e as Error).message != 'onlyProducerAllowed but found: TmpTstContracts1/aaa/b..odmd_us_west_1__sandbox contains TmpTstContracts1/aaa/b..odmd_us_west_1__sandbox/asdf') {
            throw e
        }
        console.log(e)
    }

});
