import {CfnOutput, CfnParameter, IAspect, NestedStack, Stack} from "aws-cdk-lib";
import {IConstruct} from "constructs";
import {OndemandContracts} from "../OndemandContracts";
import {ContractsShareIn, ContractsShareOut} from "./contracts-share-values";

export class ContractsAspect implements IAspect {
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

            let odmdNowParam = s.node.children.find(n => n instanceof CfnParameter && n.node.id == ContractsShareIn.ODMD_NOW) as CfnParameter;
            if (!odmdNowParam) {
                odmdNowParam = new CfnParameter(s, ContractsShareIn.ODMD_NOW, {
                    type: 'Number',
                    default: new Date().getTime()
                })
            }
            const buildSrcRevParam = new CfnParameter(s, OndemandContracts.STACK_PARAM_BUILD_SRC_REV, {
                type: 'String',
                default: '',
                description: 'BUILD_SRC_REV'
            })

            new CfnOutput(s, ContractsShareIn.ODMD_NOW + '-out', {
                key: ContractsShareIn.ODMD_NOW,
                value: buildSrcRevParam.valueAsString + '-' + odmdNowParam.valueAsString
            })

            this.shareInVers(s);
            this.shareOutVers(s);
        }
    }

    private shareOutVers(s: Stack) {
        const odmdShareOutVersionMapOut = new Map<string, any>(
            s.node.findAll()
                .filter(n => n instanceof ContractsShareOut)
                .map(n => n as ContractsShareOut)
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
                .filter(n => n instanceof ContractsShareIn)
                .map(n => n as ContractsShareIn)
                .map(si =>
                    [si.producerEnver.owner.buildId + '/' + si.producerEnver.targetRevision.toPathPartStr(), si.getInVersions()]
                )
        )

        if (odmdShareInVersionMapOut.size > 0) {
            new CfnOutput(s, 'odmdShareInVersionMapOut', {
                key: 'odmdShareInVersionMapOut',
                value: JSON.stringify(Object.fromEntries(odmdShareInVersionMapOut))
            })
        }
    }
}