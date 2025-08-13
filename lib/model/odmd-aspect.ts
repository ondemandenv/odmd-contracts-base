import {
    App,
    CfnElement,
    CfnOutput,
    CfnParameter,
    CustomResource,
    Fn,
    IAspect,
    NestedStack,
    Stack,
    Tags
} from "aws-cdk-lib";
import {IConstruct} from "constructs";
import {OndemandContracts} from "../OndemandContracts";
import {GET_SHARE_THRU_SSM_PROVIDER_NAME, OdmdShareIn, OdmdShareOut, SHARE_VERSIONS} from "./odmd-share-refs";
import {OdmdEnverUserAuth} from "../repos/__user-auth/odmd-build-user-auth";

export class OdmdAspect implements IAspect {
    visit(node: IConstruct): void {
        if (node instanceof Stack) {
            const s = node as Stack
            if (s instanceof NestedStack) {
                console.error(` !!!!!!!!!!!!!!!!!   >>>>>
Nested stacks can sometimes introduce more complexity than they solve:
While they offer benefits in terms of organization and modularity, they can also lead to the following challenges:

Hidden Dependencies:  Dependencies between nested stacks can become difficult to track and manage. A change in one nested stack might unexpectedly impact another, leading to errors or unexpected behavior.

Rollback Complications:  Rolling back changes in a stack with nested stacks can be tricky. CloudFormation attempts to roll back changes in reverse order, but dependencies can make this process unreliable.

Limited Visibility: CloudFormation's built-in tools don't always provide granular visibility into changes within nested stacks. This can make troubleshooting and debugging more difficult.

Increased Overhead: Managing multiple nested stacks can add overhead to your development and deployment processes. You might need to deploy and update each nested stack individually, which can be time-consuming.

Debugging Challenges: Errors in nested stacks can be harder to diagnose because the error messages might not always pinpoint the exact location of the problem.
<<<<<<<<  !!!!!!!!!!!!!!!!!`)
            }

            new CfnParameter(s, OndemandContracts.STACK_PARAM_BUILD_SRC_REPO, {
                type: 'String',
                default: '',
                description: 'BUILD_SRC_REPO'
            })

            new CfnParameter(s, OndemandContracts.STACK_PARAM_ODMD_DEP_REV, {
                type: 'String',
                default: '',
                description: 'ODMD_DEP_REV'
            })

            new CfnParameter(s, OndemandContracts.STACK_PARAM_ODMD_BUILD, {
                type: 'String',
                default: '',
                description: 'ODMD_BUILD'
            })


            new CfnParameter(s, OndemandContracts.STACK_PARAM_BUILD_SRC_REF, {
                type: 'String',
                default: '',
                description: 'BUILD_SRC_REF'
            })

            let odmdNowParam = s.node.children.find(n => n instanceof CfnParameter && n.node.id == OdmdShareIn.ODMD_NOW) as CfnParameter;
            if (!odmdNowParam) {
                odmdNowParam = new CfnParameter(s, OdmdShareIn.ODMD_NOW, {
                    type: 'Number',
                    default: new Date().getTime()
                })
            }
            const buildSrcRevParam = new CfnParameter(s, OndemandContracts.STACK_PARAM_BUILD_SRC_REV, {
                type: 'String',
                default: '',
                description: 'BUILD_SRC_REV'
            })

            new CfnOutput(s, OdmdShareIn.ODMD_NOW + '-out', {
                key: OdmdShareIn.ODMD_NOW,
                value: buildSrcRevParam.valueAsString + '-' + odmdNowParam.valueAsString
            })

            /*

                        s.node.findAll().filter(n => TagManager.isTaggable(n)
                            && n.tags
                            //todo: this is not working because TagManager is thru Aspects and tags.tagValues() is empty all the time.
                            && n.tags.tagValues()[OdmdShareIn.ODMD_NOW] != undefined)
                            .map(n => TagManager.of(n)!)
                            .forEach(n => n.setTag(OdmdShareIn.ODMD_NOW, odmdNowParam.valueAsString))
            */


            if (
                OndemandContracts.REV_REF_value
                && process.env['ODMD_build_id']
                && s.stackName.startsWith(process.env['ODMD_build_id']!)
            ) {
                this.shareInVers(s);
                this.shareOutVers(s);
            }
        } else if (node instanceof CfnElement) {
            const logicalId = node.stack.getLogicalId(node);
            Tags.of(node).add("stackName", node.stack.stackName)
            Tags.of(node).add("logicalId", logicalId)
        } else if (node instanceof App) {
            const all = node.node.findAll();

            OdmdShareOut.validate( all )

            all.filter(node => node instanceof OdmdEnverUserAuth).forEach(node => {

                const errMsgArr = [...node.callbackUrls, ...node.logoutUrls]
                    .filter(u => u.options.defaultIfAbsent == undefined ||
                        (
                            !u.options.defaultIfAbsent.startsWith('http')
                            && !u.options.defaultIfAbsent.startsWith('https')
                        )
                    ).map(u => `OdmdEnverUserAuth: ${u.toOdmdRef()} have to have default value start with http:// or https:// to go around circular dependencies`);

                if (errMsgArr.length > 0) {
                    throw new Error(errMsgArr.join('\n'))
                }
            })
        }
    }

    private shareOutVers(s: Stack) {
        const odmdShareOutVersionMapOut = new Map<string, any>(
            s.node.findAll()
                .filter(n => n instanceof OdmdShareOut)
                .map(n => n as OdmdShareOut)
                .map(so =>
                    [so.producingEnver.owner.buildId + '/' + so.producingEnver.targetRevision.toPathPartStr(), so.outVersions]
                )
        )
        if (odmdShareOutVersionMapOut.size > 0) {
            new CfnOutput(s, 'odmdShareOutVersionMapOut', {
                key: 'odmdShareOutVersionMapOut',
                value: JSON.stringify(Object.fromEntries(odmdShareOutVersionMapOut))
            })

        }
    }

    private shareInVers(s: Stack) {
        const odmdShareInVersionMapOut = new Map<string, any>(
            s.node.findAll()
                .filter(n => n instanceof OdmdShareIn)
                .map(n => n as OdmdShareIn)
                .map(si =>
                    [si.producerEnver.owner.buildId + '/' + si.producerEnver.targetRevision.toPathPartStr(), si.getInVersions()]
                )
        )

        if (odmdShareInVersionMapOut.size > 0) {
            new CfnOutput(s, 'odmdShareInVersionMapOut', {
                key: 'odmdShareInVersionMapOut',
                value: JSON.stringify(Object.fromEntries(odmdShareInVersionMapOut))
            })

            const vi64arr = [] as string[]
            odmdShareInVersionMapOut.forEach((v, k) => {
                vi64arr.push(k + ':' + v)
            })

            new CustomResource(s, 'enver-envar-ver--' + OndemandContracts.REV_REF_value, {
                serviceToken: Fn.importValue(GET_SHARE_THRU_SSM_PROVIDER_NAME(process.env.ODMD_build_id!, s.region, s.account)),
                resourceType: 'Custom::OutputToCentralSSM',
                properties: {
                    [OndemandContracts.REV_REF_name]: OndemandContracts.REV_REF_value,
                    [OndemandContracts.REV_REF_name + '...']: s.stackName,
                    [SHARE_VERSIONS]: JSON.stringify(vi64arr)
                }
            })
        }
    }
}