import {OndemandContracts} from "../lib/OndemandContracts";
import {ContractsEnverCtnImg} from "../lib/odmd-model/contracts-enver-ctn-img";
import {App, Stack} from "aws-cdk-lib";
import {Repository, RepositoryProps} from "aws-cdk-lib/aws-ecr";
import {TmpTstContracts} from "./tmp-tst-contracts";


test('make_sense1', () => {

    process.env.CDK_DEFAULT_ACCOUNT = 'aaaaaa'
    process.env.CDK_DEFAULT_REGION = 'us-west-1'
    const app = new App()
    new TmpTstContracts(app)

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

    // await CurrentEnver.init()

    OndemandContracts.inst.odmdBuilds.forEach(cc => {
        cc.envers.forEach(enver => {
            if (enver instanceof ContractsEnverCtnImg) {

                let cimgEnvr = enver as ContractsEnverCtnImg;
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

});
